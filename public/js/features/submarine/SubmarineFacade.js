import { SubmarineStateMachine } from './submarineStateMachine.js';
import { SubmarineStates } from './submarineStates.js';

/**
 * Safe interface for accessing submarine states game-wide.
 * Manages instances of SubmarineStateMachine for all submarines.
 */
class SubmarineFacade {
    constructor() {
        this._submarines = new Map();
    }

    /**
     * Initializes state machines for the given submarine IDs.
     * @param {Array<string>} ids 
     */
    init(ids) {
        ids.forEach(id => {
            if (!this._submarines.has(id)) {
                this._submarines.set(id, new SubmarineStateMachine(id));
            }
        });
    }

    /**
     * Gets state machine for a specific sub.
     * @param {string} id 
     * @returns {SubmarineStateMachine|null}
     */
    getSub(id) {
        return this._submarines.get(id) || null;
    }

    /**
     * Helper to check if a sub can move.
     * @param {string} id 
     * @returns {boolean}
     */
    canMove(id) {
        const sub = this.getSub(id);
        return sub ? sub.canMove() : false;
    }

    /**
     * Helper to check if a sub can fire.
     * @param {string} id 
     * @returns {boolean}
     */
    canFire(id) {
        const sub = this.getSub(id);
        return sub ? sub.canFire() : false;
    }

    /**
     * Helper to get state of a sub.
     * @param {string} id 
     * @returns {string|null}
     */
    getState(id) {
        const sub = this.getSub(id);
        return sub ? sub.getState() : null;
    }

    /**
     * Subscribes to events for a specific sub.
     * @param {string} id 
     * @param {Function} callback 
     */
    subscribe(id, callback) {
        const sub = this.getSub(id);
        if (sub) sub.subscribe(callback);
    }

    /**
     * Unsubscribes from events for a specific sub.
     * @param {string} id 
     * @param {Function} callback 
     */
    unsubscribe(id, callback) {
        const sub = this.getSub(id);
        if (sub) sub.unsubscribe(callback);
    }
}

export const submarineFacade = new SubmarineFacade();
