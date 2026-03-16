import { BaseController } from '../../control/baseController';
import { submarine } from './submarine';

/**
 * SubmarineController
 * The "Facade" or "Bridge" for the Submarine feature.
 * Provides a safe, high-level API for Scene Controllers to query submarine facts
 * without needing to know about the underlying singleton or network transport.
 */
export class SubmarineController extends BaseController {
    constructor() {
        super();
        this._feature = submarine;
    }

    /**
     * Overrides the default socket logic. 
     * The facade relies on the persistent 'submarine' feature to handle 
     * raw state parsing.
     */
    onGameStateUpdate(state) {
        // We defer to the feature for the heavy lifting.
        // However, we still trigger local events if any scene-specific 
        // logic needs to react to the raw broadcast.
        super.onGameStateUpdate(state);
    }

    // ─────────── Identity ───────────

    /**
     * Returns the SubmarineState instance for the local player.
     * @returns {import('./SubmarineState').SubmarineState|null}
     */
    getOwnship() {
        return this._feature.getOwnship();
    }

    /**
     * Returns the role key for the local player (co, xo, sonar, eng).
     * @returns {string|null}
     */
    getLocalRole() {
        return this._feature.getLocalRole();
    }

    // ─────────── Logical Gating (The "Why") ───────────

    /**
     * @returns {boolean} True if the player's submarine is permitted to move.
     */
    canMove() {
        const sub = this.getOwnship();
        return sub ? sub.canMove() : false;
    }

    /**
     * @param {string} systemKey 
     * @returns {boolean} True if the system is ready to be used.
     */
    canFire(systemKey) {
        const sub = this.getOwnship();
        return sub ? sub.canFire(systemKey) : false;
    }

    // ─────────── Data Accessors (The "Facts") ───────────

    /**
     * @returns {object} { current, max, percent, isCritical }
     */
    getHealth() {
        const sub = this.getOwnship();
        return sub ? sub.getHealth() : { current: 0, max: 4, percent: 0, isCritical: false };
    }

    /**
     * @returns {string} Logical state (e.g., SUBMERGED, MOVED)
     */
    getState() {
        const sub = this.getOwnship();
        return sub ? sub.getState() : 'UNKNOWN';
    }

    /**
     * @returns {string} Human-readable status message.
     */
    getStatusMessage() {
        const sub = this.getOwnship();
        return sub ? sub.getStatusMessage() : 'Awaiting Connection...';
    }

    // ─────────── Event Proxying ───────────

    /**
     * Convenience method to subscribe to ownship events.
     */
    subscribeToOwnship(event, handler) {
        const sub = this.getOwnship();
        if (sub) {
            sub.on(event, handler);
        } else {
            // If ownship isn't resolved yet, wait for it
            this._feature.once('identity:resolved', ({ sub }) => {
                sub.on(event, handler);
            });
        }
    }
}
