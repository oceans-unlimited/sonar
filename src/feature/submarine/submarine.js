import { EventEmitter } from 'pixi.js';
import { SubmarineState } from './SubmarineState.js';
import { socketManager } from '../../core/socketManager.js';

/**
 * Submarine Feature
 * Persistent application-level service that manages the life of SubmarineState instances.
 * Listens to the socket and provides normalized data access to the rest of the application.
 */
class Submarine extends EventEmitter {
    constructor() {
        super();
        this._submarines = new Map(); // subId -> SubmarineState
        this._ownship = null;
        this._localRole = null;

        this._init();
    }

    /**
     * Initializes the socket subscription.
     */
    _init() {
        // Listen for standard state updates from the server
        socketManager.on('stateUpdate', (state) => this.handleStateUpdate(state));
        
        // Listen for player ID assignment to resolve "Who am I?"
        socketManager.on('playerId', () => {
            if (socketManager.lastState) {
                this.handleStateUpdate(socketManager.lastState);
            }
        });
    }

    /**
     * Orchestrates the update of all submarine instances.
     * Identifies and caches the "ownship" based on the local playerId.
     * @param {object} fullState - The global game state snapshot.
     */
    handleStateUpdate(fullState) {
        if (!fullState || !fullState.submarines) return;

        const playerId = socketManager.playerId;

        fullState.submarines.forEach(subData => {
            let sub = this._submarines.get(subData.id);

            // 1. Create instance if it doesn't exist
            if (!sub) {
                sub = new SubmarineState(subData.id);
                this._submarines.set(subData.id, sub);
                console.log(`[SubmarineFeature] Registered Sub ${subData.id}`);

                // 1.1. Event Bubbling: Relay state events to the feature level
                sub.on('sub:moved', (data) => this.emit('submarine:moved', { id: subData.id, ...data }));
                sub.on('sub:damaged', (data) => this.emit('submarine:damaged', { id: subData.id, ...data }));
                sub.on('sub:stateChanged', (data) => this.emit('submarine:stateChanged', { id: subData.id, ...data }));
            }

            // 2. Update the state object
            sub.update(subData);

            // 3. Resolve Identity Cache (Search Once)
            if (playerId && sub.isOwnship(playerId)) {
                if (this._ownship !== sub) {
                    this._ownship = sub;
                    this._localRole = sub.getRole(playerId);
                    console.log(`[SubmarineFeature] Ownship Identity Resolved: Sub ${subData.id} as ${this._localRole}`);
                    this.emit('identity:resolved', { sub, role: this._localRole });
                }
            }
        });

        this.emit('submarine:allUpdated', this._submarines);
    }

    /**
     * Returns the SubmarineState object for the local player.
     * @returns {SubmarineState|null}
     */
    getOwnship() {
        return this._ownship;
    }

    /**
     * Returns the role key for the local player.
     * @returns {string|null}
     */
    getLocalRole() {
        return this._localRole;
    }

    /**
     * Returns a specific submarine by ID.
     * @param {string} id 
     * @returns {SubmarineState|null}
     */
    getSub(id) {
        return this._submarines.get(id) || null;
    }

    /**
     * Returns all registered submarines.
     * @returns {Map<string, SubmarineState>}
     */
    getAllSubmarines() {
        return this._submarines;
    }

    /**
     * Reset the feature state (useful for system resets/test reloads).
     */
    reset() {
        this._submarines.clear();
        this._ownship = null;
        this._localRole = null;
    }
}

// Export as a singleton
export const submarine = new Submarine();
