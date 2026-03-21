import { EventEmitter } from 'pixi.js';
import { MapUtils } from '../map/mapUtils';

/**
 * SubmarineState
 * The "View Model" for a single submarine instance.
 * Normalizes raw server JSON and provides high-signal events and logical queries.
 */
export class SubmarineState extends EventEmitter {
    constructor(id) {
        super();
        this._id = id;

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
     * Ingests a raw data snapshot from the server and updates internal state.
     * Emits specific events if key properties have changed.
     * @param {object} newData - Raw submarine object from the server array.
     */
    update(newData) {
        if (!newData) return;

        const oldPos = { row: this._data.row, col: this._data.col };
        const oldHealth = this._data.health;
        const oldSubState = this._data.submarineState;

        // 1. Deep Update (Partial)
        // We manually map key fields to ensure schema stability
        this._data = {
            ...this._data,
            ...newData,
            // Ensure nested objects are also merged if provided
            submarineStateData: {
                ...this._data.submarineStateData,
                ...(newData.submarineStateData || {})
            }
        };

        // 2. Position History Tracking
        // If position changed, log it to persistent history
        if (newData.row !== undefined && (newData.row !== oldPos.row || newData.col !== oldPos.col)) {
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

        // Generic update for all other data
        this.emit('sub:updated', this._data);
    }

    // ─────────── Logical Queries (The "Why") ───────────

    /**
     * @returns {boolean} True if the sub is in a state where it can legally move.
     */
    canMove() {
        // Must be submerged AND not currently mid-turn (MOVED)
        return this._data.submarineState === 'SUBMERGED' && !this._data.health <= 0;
    }

    /**
     * @param {string} systemKey - sonar, torpedo, etc.
     * @returns {boolean} True if the system is fully charged and ready to fire.
     */
    canFire(systemKey) {
        const level = this._data.actionGauges[systemKey] || 0;
        const max = (systemKey === 'silence' || systemKey === 'scenario') ? 5 : 3;
        return this._data.submarineState === 'SUBMERGED' && level >= max;
    }

    /**
     * @param {string} playerId 
     * @returns {boolean} True if the provided ID matches any role on this sub.
     */
    isOwnship(playerId) {
        return (
            this._data.co === playerId ||
            this._data.xo === playerId ||
            this._data.sonar === playerId ||
            this._data.eng === playerId
        );
    }

    /**
     * @param {string} playerId 
     * @returns {string|null} The role key (co, xo, sonar, eng) or null.
     */
    getRole(playerId) {
        if (this._data.co === playerId) return 'co';
        if (this._data.xo === playerId) return 'xo';
        if (this._data.sonar === playerId) return 'sonar';
        if (this._data.eng === playerId) return 'eng';
        return null;
    }

    isStealthActive() {
        // Example logic: if the last move was 'silence' or if in a specific state
        return this._data.actionGauges.silence === 0 && this._previousState === 'SUBMERGED';
    }

    // ─────────── Logical Map Queries ───────────

    /**
     * @param {number} row 
     * @param {number} col 
     * @returns {boolean} True if the given coordinates are in the sub's past track.
     */
    isInPastTrack(row, col) {
        return (this._data.past_track || []).some(pos => pos.row === row && pos.col === col);
    }

    /**
     * @param {number} row 
     * @param {number} col 
     * @returns {boolean} True if there is a mine at the given coordinates.
     */
    hasMineAt(row, col) {
        return (this._data.mines || []).some(pos => pos.row === row && pos.col === col);
    }

    /**
     * Returns all valid directional moves from the current position.
     * @param {object} gameState - Global game state for board collision checks.
     * @returns {object[]} Array of { direction, row, col }
     */
    getValidMoves(gameState) {
        if (!gameState) return [];
        const currentPos = { row: this._data.row, col: this._data.col };
        const possibleMoves = MapUtils.getPossibleMoves(currentPos, false);
        return MapUtils.filterInvalidMoves(gameState, this._data, possibleMoves);
    }

    /**
     * @param {string} direction - N, S, E, W
     * @param {object} gameState - Global game state.
     * @returns {boolean}
     */
    isValidMove(direction, gameState) {
        const validMoves = this.getValidMoves(gameState);
        return validMoves.some(m => m.direction === direction);
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

    /**
     * Returns the asset key for the submarine's profile image.
     * Convention: public/assets/ui/sub_profile[ID].svg -> asset key 'sub_profile[ID]'
     * @returns {string} 
     */
    getProfileAsset() {
        // IDs are typically 'A', 'B', etc.
        return `sub_profile${this._id}`;
    }

    getTrack() {
        return [...this._data.past_track];
    }

    getHistory() {
        return [...this._data.position_history];
    }

    getLastPingData() {
        return this._data.ping_data ? { ...this._data.ping_data } : null;
    }

    getState() {
        return this._data.submarineState;
    }

    getId() {
        return this._data.id;
    }

    getEngineLayout() {
        return this._data.engineLayout || {};
    }

    getGauges() {
        return this._data.actionGauges || {};
    }

    getMines() {
        return this._data.mines || [];
    }

    getStateData(stateKey) {
        return this._data.submarineStateData[stateKey] || null;
    }

    getStatusMessage() {
        const state = this._data.submarineState;
        const data = this._data.submarineStateData[state];

        switch (state) {
            case 'MOVED':
                if (!data.engineerCrossedOutSystem) return "Awaiting Engineer Confirmation";
                if (!data.xoChargedGauge) return "Awaiting First Officer Charging";
                return "Preparing to Submerge";
            case 'SURFACING':
                return "Emergency Surfacing in Progress";
            case 'SURFACED':
                return "Vessel Surfaced - System Repair Active";
            case 'DESTROYED':
                return "Hull Breach: Vessel Lost";
            default:
                return "Vessel Submerged - All Systems Nominal";
        }
    }
}
