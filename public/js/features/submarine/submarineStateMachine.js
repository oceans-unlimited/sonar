import { SubmarineStates } from './submarineStates.js';
import { SubmarineEvents } from './submarineEvents.js';
import { SubmarineTransitions } from './submarineTransitions.js';

/**
 * Authoritative state machine for a single submarine.
 */
export class SubmarineStateMachine {
    constructor(id) {
        this.id = id;
        this._state = SubmarineStates.SUBMERGED;
        this._listeners = new Set();
    }

    /**
     * Attempts to transition to a new state.
     * @param {string} newState 
     */
    transitionTo(newState) {
        if (this._state === newState) return;

        if (this._isValidTransition(this._state, newState)) {
            const oldState = this._state;
            this._state = newState;
            this._emit(SubmarineEvents.SUB_STATE_CHANGED, { state: newState, oldState, subId: this.id });
        } else {
            console.warn(`[SubmarineStateMachine ${this.id}] Invalid transition: ${this._state} -> ${newState}`);
        }
    }

    /**
     * Returns the current state.
     * @returns {string}
     */
    getState() {
        return this._state;
    }

    /**
     * Gating: Can the submarine move in its current state?
     * @returns {boolean}
     */
    canMove() {
        return this._state === SubmarineStates.SUBMERGED;
    }

    /**
     * Gating: Can the submarine fire systems in its current state?
     * @returns {boolean}
     */
    canFire() {
        // According to user rules, attacks might be allowed during surfacing/surfaced?
        // "TRANSMIT SECTOR, ICE CHECK" - Surfacing
        // "SURFACED: Mini-game active, most UI locked (sonar visual only)"
        // Let's assume only SUBMERGED allows standard firing for now.
        return this._state === SubmarineStates.SUBMERGED;
    }

    /**
     * Gating: Is the submarine currently dead?
     * @returns {boolean}
     */
    isDestroyed() {
        return this._state === SubmarineStates.DESTROYED;
    }

    /**
     * Subscribes to submarine events.
     * @param {Function} callback 
     */
    subscribe(callback) {
        this._listeners.add(callback);
    }

    /**
     * Unsubscribes from submarine events.
     * @param {Function} callback 
     */
    unsubscribe(callback) {
        this._listeners.delete(callback);
    }

    _isValidTransition(from, to) {
        return SubmarineTransitions[from] && SubmarineTransitions[from].includes(to);
    }

    _emit(event, payload) {
        this._listeners.forEach(callback => callback(event, payload));
    }
}
