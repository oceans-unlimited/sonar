import { EventEmitter } from 'pixi.js';
import { MapUtils } from '../map/mapUtils';

/**
 * SubmarineState
 * The "View Model" for a single submarine instance.
 * Normalizes raw server JSON and provides high-signal events and logical queries.
 * Dependency Injection: mapManager is injected at creation for spatial queries.
 */
export class SubmarineState extends EventEmitter {
    constructor(id) {
        super();
        this._id = id;
        this._mapManager = null; // Injected via setMapManager

        // Baseline Schema
        this._data = {
            id: id,
            name: `Sub ${id}`,
            co: null,
            xo: null,
            sonar: null,
            eng: null,
            row: 0,
            col: 0,
            health: 4,
            submarineState: 'SUBMERGED',
            past_track: [],
            position_history: [],
            mines: [],
            ping_data: null,
            engineLayout: {},
            actionGauges: {
                sonar: 0,
                drone: 0,
                mine: 0,
                torpedo: 0,
                silence: 0,
                scenario: 0
            },
            submarineStateData: {
                MOVED: {
                    directionMoved: ' ',
                    engineerCrossedOutSystem: false,
                    xoChargedGauge: false
                },
                SURFACING: {
                    roleTaskCompletion: []
                }
            }
        };

        this._previousState = null;
    }

    /**
     * Dependency Injection for spatial validation.
     */
    setMapManager(mm) {
        this._mapManager = mm;
    }

    /**
     * Ingests a raw data snapshot from the server and updates internal state.
     * Emits specific events if key properties have changed.
     * @param {object} newData - Raw submarine object from the server array.
     */
    update(newData) {
        if (!newData) return;

        const oldPos = { row: this._data.row, col: this._data.col };
        const oldHealth = this._data.health;
        const oldSubState = this._data.submarineState;
        const oldEngineLayout = this._data.engineLayout || {};
        const oldCrossedOut = oldEngineLayout.crossedOutSlots || [];

        // 1. Deep Update (Partial)
        this._data = {
            ...this._data,
            ...newData,
            submarineStateData: {
                ...this._data.submarineStateData,
                ...(newData.submarineStateData || {})
            },
            engineLayout: {
                ...this._data.engineLayout,
                ...(newData.engineLayout || {})
            }
        };

        const newEngineLayout = this._data.engineLayout;
        const newCrossedOut = newEngineLayout.crossedOutSlots || [];

        // 2. Position History Tracking
        if (newData.row !== undefined && (newData.row !== oldPos.row || newData.col !== oldPos.col)) {
            if (oldPos.row !== undefined && oldPos.col !== undefined) {
                if (!this.isInPastTrack(oldPos.row, oldPos.col)) {
                    this._data.past_track.push({ row: oldPos.row, col: oldPos.col });
                }
            }
            this._data.position_history.push({ row: newData.row, col: newData.col });
            this.emit('sub:moved', this.getPosition());
        }

        // 3. Change Detection & Event Emission
        if (this._data.health !== oldHealth) {
            this.emit('sub:damaged', this.getHealth());
        }

        if (this._data.submarineState !== oldSubState) {
            this._previousState = oldSubState;
            this.emit('sub:stateChanged', {
                state: this._data.submarineState,
                previous: oldSubState
            });
        }

        if (JSON.stringify(oldCrossedOut) !== JSON.stringify(newCrossedOut)) {
            this.emit('sub:engineUpdated', {
                layout: newEngineLayout,
                previousCount: oldCrossedOut.length,
                newCount: newCrossedOut.length,
                wasReset: oldCrossedOut.length > 0 && newCrossedOut.length === 0
            });
        }

        this.emit('sub:updated', this._data);
    }

    // ─────────── Logical Queries (The "Why") ───────────

    canMove() {
        return this._data.submarineState === 'SUBMERGED' && this._data.health > 0;
    }

    canFire(systemKey) {
        const level = this._data.actionGauges[systemKey] || 0;
        const max = (systemKey === 'silence' || systemKey === 'scenario') ? 5 : 3;
        return this._data.submarineState === 'SUBMERGED' && level >= max;
    }

    isOwnship(playerId) {
        return (
            this._data.co === playerId ||
            this._data.xo === playerId ||
            this._data.sonar === playerId ||
            this._data.eng === playerId
        );
    }

    getRole(playerId) {
        if (this._data.co === playerId) return 'co';
        if (this._data.xo === playerId) return 'xo';
        if (this._data.sonar === playerId) return 'sonar';
        if (this._data.eng === playerId) return 'eng';
        return null;
    }

    isStealthActive() {
        return this._data.actionGauges.silence === 0 && this._previousState === 'SUBMERGED';
    }

    // ─────────── Logical Map Queries ───────────

    isInPastTrack(row, col) {
        return (this._data.past_track || []).some(pos => pos.row === row && pos.col === col);
    }

    hasMineAt(row, col) {
        return (this._data.mines || []).some(pos => pos.row === row && pos.col === col);
    }

    addMine(row, col) {
        if (!this.hasMineAt(row, col)) {
            this._data.mines.push({ row, col });
            this.emit('sub:updated', this._data);
        }
    }

    getValidMoves(isStealth = false) {
        if (this.getState() !== 'SUBMERGED') return [];

        const directions = ['N', 'S', 'E', 'W'];
        const validMoves = [];
        const maxRange = isStealth ? 4 : 1;

        directions.forEach(dir => {
            for (let d = 1; d <= maxRange; d++) {
                if (this.isValidMove(dir, d)) {
                    const target = this._getTargetCoords(dir, d);
                    validMoves.push({ direction: dir, ...target, distance: d });
                } else {
                    break;
                }
            }
        });

        return validMoves;
    }

    isValidMove(direction, distance = 1) {
        // U-turns are naturally prevented by past_track containing the previous position.
        // No need to separately track last move direction.
        for (let d = 1; d <= distance; d++) {
            const target = this._getTargetCoords(direction, d);

            if (this.isInPastTrack(target.row, target.col)) {
                return false;
            }

            if (this._mapManager) {
                const obstacleStatus = this._mapManager.getSpatialObstacles(target, this._id);
                if (obstacleStatus !== 'CLEAR') {
                    return false;
                }
            }
        }

        return true;
    }

    _getTargetCoords(direction, distance = 1) {
        const dr = { N: -1, S: 1, E: 0, W: 0 }[direction] || 0;
        const dc = { N: 0, S: 0, E: 1, W: -1 }[direction] || 0;
        return {
            row: this._data.row + (dr * distance),
            col: this._data.col + (dc * distance)
        };
    }

    // ─────────── Formatted Getters (The "Facts") ───────────

    getPosition() {
        const row = this._data.row;
        const col = this._data.col;
        return {
            row,
            col,
            sector: MapUtils.getSector(row, col),
            alphaNumeric: MapUtils.toAlphaNumeric(row, col)
        };
    }

    getHealth() {
        return {
            current: this._data.health,
            max: 4,
            percent: (this._data.health / 4) * 100,
            isCritical: this._data.health <= 1
        };
    }

    getProfileAsset() {
        return `sub_profile${this._id}`;
    }

    getTrack() { return [...this._data.past_track]; }
    getHistory() { return [...this._data.position_history]; }
    getLastPingData() { return this._data.ping_data ? { ...this._data.ping_data } : null; }
    getState() { return this._data.submarineState; }
    getId() { return this._data.id; }
    getEngineLayout() { return this._data.engineLayout || {}; }
    getGauges() { return this._data.actionGauges || {}; }
    getMines() { return this._data.mines || []; }
    getStateData(stateKey) { return this._data.submarineStateData[stateKey] || null; }

    getStatusMessage() {
        const state = this._data.submarineState;
        const data = this._data.submarineStateData[state];

        switch (state) {
            case 'MOVED':
                if (!data.engineerCrossedOutSystem) return "Awaiting Engineer Confirmation";
                if (!data.xoChargedGauge) return "Awaiting First Officer Charging";
                return "Preparing to Submerge";
            case 'SURFACING': return "Emergency Surfacing in Progress";
            case 'SURFACED': return "Vessel Surfaced - System Repair Active";
            case 'DESTROYED': return "Hull Breach: Vessel Lost";
            default: return "Vessel Submerged - All Systems Nominal";
        }
    }
}
