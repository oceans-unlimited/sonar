import { submarineFacade } from './SubmarineFacade.js';
import { SubmarineStates } from './submarineStates.js';
import { SurfacingRules } from './surfacingRules.js';
import { interruptController } from '../interrupts/InterruptController.js';

/**
 * Orchestrates the surfacing flow for a submarine.
 */
export class SurfacingController {
    constructor() {
        this._currentFlows = new Map(); // subId -> { timer, data }
    }

    /**
     * Starts the surfacing flow for a sub.
     * @param {string} subId 
     * @param {object} position - { row, col }
     */
    requestSurface(subId, position) {
        const sub = submarineFacade.getSub(subId);
        if (!sub || sub.getState() !== SubmarineStates.SUBMERGED) return;

        // 1. Transition to SURFACING
        sub.transitionTo(SubmarineStates.SURFACING);

        // 2. Transmit Sector (Logic for actual transmission would be socket-driven, but here we track it)
        const sector = SurfacingRules.getSector(position.row, position.col);
        console.log(`[SurfacingController] Sub ${subId} surfacing in Sector ${sector}`);

        // 3. Ice Check (Triggering a potential interrupt or just applying damage)
        // In a real scenario, this might be an interrupt "ICE_DAMAGE"
        // For now, we'll simulate a small delay before becoming fully SURFACED
        setTimeout(() => {
            this._onSurfacingComplete(subId);
        }, 1000);
    }

    _onSurfacingComplete(subId) {
        const sub = submarineFacade.getSub(subId);
        if (!sub || sub.getState() !== SubmarineStates.SURFACING) return;

        // 4. Transition to SURFACED
        sub.transitionTo(SubmarineStates.SURFACED);
        console.log(`[SurfacingController] Sub ${subId} is now SURFACED.`);
    }

    /**
     * Completes surfacing (re-submerges).
     * @param {string} subId 
     */
    requestSubmerge(subId) {
        const sub = submarineFacade.getSub(subId);
        if (!sub || sub.getState() !== SubmarineStates.SURFACED) return;

        // 5. Transition to SUBMERGED
        sub.transitionTo(SubmarineStates.SUBMERGED);
        console.log(`[SurfacingController] Sub ${subId} re-submerged.`);
    }

    /**
     * Handles fatal damage.
     * @param {string} subId 
     */
    handleDestruction(subId) {
        const sub = submarineFacade.getSub(subId);
        if (sub) {
            sub.transitionTo(SubmarineStates.DESTROYED);
        }
    }
}

export const surfacingController = new SurfacingController();
