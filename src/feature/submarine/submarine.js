import { EventEmitter } from 'pixi.js';
import { SubmarineState } from './SubmarineState.js';
import { socketManager } from '../../core/socketManager.js';
import { mapManager } from '../map/mapManager.js';

/**
 * Submarine Feature
 * Persistent application-level service that manages the life of SubmarineState instances.
 * Primary listener for socket state updates.
 * Orchestrates data sync to MapManager.
 */
class Submarine extends EventEmitter {
    constructor() {
        super();
        this._submarines = new Map(); // subId -> SubmarineState
        this._ownship = null;
        this._localRole = null;

        this._init();
    }

    _init() {
        // Primary state listener
        socketManager.on('stateUpdate', (state) => this.handleStateUpdate(state));
        
        socketManager.on('playerId', () => {
            if (socketManager.lastState) {
                this.handleStateUpdate(socketManager.lastState);
            }
        });

        socketManager.on('SONAR_PING', (data) => {
            mapManager.handleEnemyPing(data);
        });

        socketManager.on('mine_deployed', (data) => {
            const sub = this.getSub(data.subId);
            if (sub) {
                sub.addMine(data.row, data.col);
                this._syncMinesToMap();
                this.emit('submarine:allUpdated', this._submarines);
            }
        });

        socketManager.on('submarine_moved', (data) => {
            const sub = this.getSub(data.id);
            if (sub) {
                sub.update({ row: data.row, col: data.col });
                this.emit('submarine:moved', { id: data.id, row: data.row, col: data.col });
            }
        });
    }

    handleStateUpdate(fullState) {
        if (!fullState) return;

        // 1. Submarine Updates
        if (fullState.submarines) {
            const playerId = socketManager.playerId;

            fullState.submarines.forEach(subData => {
                let sub = this._submarines.get(subData.id);

                if (!sub) {
                    sub = new SubmarineState(subData.id);
                    sub.setMapManager(mapManager);
                    this._submarines.set(subData.id, sub);
                    
                    // Permanent event proxies — emit directly on the Submarine singleton.
                    // These persist for the life of the SubmarineState and avoid the stale
                    // closure issue of capturing per-call local arrays.
                    const id = subData.id;
                    sub.on('sub:moved', (d) => this.emit('submarine:moved', { id, ...d }));
                    sub.on('sub:damaged', (d) => this.emit('submarine:damaged', { id, ...d }));
                    sub.on('sub:stateChanged', (d) => this.emit('submarine:stateChanged', { id, ...d }));
                }

                sub.update(subData);

                // Resolve Identity
                if (playerId && sub.isOwnship(playerId)) {
                    if (this._ownship !== sub) {
                        this._ownship = sub;
                        this._localRole = sub.getRole(playerId);
                        this.emit('identity:resolved', { sub, role: this._localRole });
                    }
                }
            });

            // 4. Global Mine Sync
            this._syncMinesToMap();
        }

        // 5. Broadcast bulk update (used by MapController for unconditional refresh)
        this.emit('submarine:allUpdated', this._submarines);
    }

    _syncMinesToMap() {
        const allMines = [];
        this._submarines.forEach(sub => {
            sub.getMines().forEach(m => {
                allMines.push({ ...m, subId: sub.getId() });
            });
        });
        mapManager.syncMines(allMines);
    }

    getOwnship() { return this._ownship; }
    getLocalRole() { return this._localRole; }
    getSub(id) { return this._submarines.get(id) || null; }
    getAllSubmarines() { return this._submarines; }

    reset() {
        this._submarines.clear();
        this._ownship = null;
        this._localRole = null;
        mapManager.reset();
    }
}

export const submarine = new Submarine();
