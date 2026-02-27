import { BaseController } from '../../control/baseController';

/**
 * SubmarineController
 * Feature controller for tracking and managing general submarine state.
 */
export class SubmarineController extends BaseController {
    constructor() {
        super();
        this.ownship = null;
    }

    /**
     * Updates local ownship reference whenever the global game state changes.
     */
    onGameStateUpdate(state) {
        if (!state || !this.socket?.playerId) return;
        
        // Find which submarine the local player belongs to
        const mySub = state.submarines?.find(sub =>
            sub.co === this.socket.playerId ||
            sub.xo === this.socket.playerId ||
            sub.sonar === this.socket.playerId ||
            sub.eng === this.socket.playerId
        );

        if (mySub) {
            this.ownship = mySub;
        }
    }

    /**
     * Returns the current health of the local player's submarine.
     */
    getHealth() {
        return this.ownship?.health || 0;
    }

    /**
     * Returns the current logical state of the submarine (SUBMERGED, MOVED, etc).
     */
    getState() {
        return this.ownship?.submarineState || 'UNKNOWN';
    }
}
