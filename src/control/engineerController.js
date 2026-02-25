/**
 * Engineer Controller
 * Handles the logic for the Engineer station scene.
 * Manages cross-off actions, system state updates, and interaction locks.
 */

import { BaseController } from './baseController';

export class EngineerController extends BaseController {
    constructor() {
        super();

        // Engineer-specific state
        this.engineState = null;
        this.isInteractionLocked = true; // Locked until server says otherwise

        // --- Handler Map ---
        this.handlers = {
            'CROSS_OFF': (d) => this.handleCrossOff(d),
            'TOGGLE_REACTOR': (d) => this.handleReactor(d),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d),
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[EngineerController] View bound.');
    }

    onGameStateUpdate(state) {
        if (!this.socket) return;
        const playerId = this.socket.playerId;
        if (!playerId || !state?.submarines) return;

        // Canonical server-side logic for finding the player's submarine
        const sub = state.submarines.find(s =>
            s.co === playerId || s.xo === playerId || s.sonar === playerId || s.eng === playerId
        );
        if (!sub) return;

        // If view hasn't been populated yet, do it now
        if (this.view && !this.view._populated && sub.engineLayout) {
            console.log('[EngineerController] Populating view with layout');
            this.view.populate(sub.engineLayout);
            this.view._populated = true;
        }

        this.engineState = sub.engineLayout;
        this.updateEngineView(state, sub);
    }

    // ─────────── View Updates ───────────

    /**
     * Syncs the visual state of all buttons with the game state.
     * @param {object} state - The full game state
     * @param {object} sub - The player's submarine
     */
    updateEngineView(state, sub) {
        if (!this.engineState) return;

        // Canonical submarine state checks (referencing SubmarineStates in constants.js)
        const canInteract = sub.submarineState === 'MOVED';
        this.isInteractionLocked = !canInteract;

        // 1. Process Frame Slots (Circuits)
        for (const [direction, dirData] of Object.entries(this.engineState.directions || {})) {
            for (const [slotId, _] of Object.entries(dirData.frameSlots || {})) {
                const buttonId = `${direction}:${slotId}`;
                const ctrl = this.buttons[buttonId];
                if (!ctrl) continue;

                // Check if this specific slot is in the crossed out list
                const isCrossed = (this.engineState.crossedOutSlots || []).some(
                    xo => xo.direction === direction && xo.slotId === slotId
                );

                if (isCrossed) {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                } else if (canInteract) {
                    ctrl.setEnabled(true);
                    ctrl.setActive(true);
                } else {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                }
            }

            // 2. Process Reactor Slots
            for (const [slotId, _] of Object.entries(dirData.reactorSlots || {})) {
                const buttonId = `${direction}:${slotId}`;
                const ctrl = this.buttons[buttonId];
                if (!ctrl) continue;

                const isCrossed = (this.engineState.crossedOutSlots || []).some(
                    xo => xo.direction === direction && xo.slotId === slotId
                );

                if (isCrossed) {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                } else if (canInteract) {
                    ctrl.setEnabled(true);
                    ctrl.setActive(true);
                } else {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                }
            }
        }
    }

    // ─────────── Handlers ───────────

    handleCrossOff({ direction, slotId }) {
        if (this.isInteractionLocked) {
            console.warn('[EngineerController] Interaction locked.');
            return;
        }

        console.log(`[EngineerController] Cross off: ${direction}/${slotId}`);
        this.socket.crossOffSystem(direction, slotId);
    }

    handleReactor({ reactorId }) {
        console.log(`[EngineerController] Toggle reactor: ${reactorId}`);
    }
}
