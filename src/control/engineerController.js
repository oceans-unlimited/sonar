/**
 * Engineer Controller
 * Handles the logic for the Engineer station scene.
 * Manages cross-off actions, system state updates, and interaction locks.
 */

import { BaseController } from './baseController';

export class EngineerController extends BaseController {
    constructor(socketManager, sceneManager) {
        super(socketManager, sceneManager);

        // Engineer-specific state
        this.engineState = null;
        this.isInteractionLocked = true; // Locked until server says otherwise

        // --- Handler Map ---
        this.handlers = {
            'CROSS_OFF': this.handleCrossOff,
            'TOGGLE_REACTOR': this.handleReactor,
            'DIRECTOR_CMD': this.handleDirectorCmd,
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        console.log('[EngineerController] View bound.');

        // Listen for game state updates
        this.onSocket('stateUpdate', (state) => this.onGameStateUpdate(state));

        // Listen for Director commands
        this.onSocket('DIRECTOR_CMD', (cmd) => this.handleEvent('DIRECTOR_CMD', cmd));
    }

    onGameStateUpdate(state) {
        // Find our submarine's engine data
        const playerId = this.socketManager.playerId;
        if (!playerId || !state?.submarines) return;

        const sub = state.submarines.find(s =>
            s.crew && Object.values(s.crew).includes(playerId)
        );
        if (!sub) return;

        this.engineState = sub.systems;
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

        // Determine if engineer can interact (based on submarine state)
        const canInteract = sub.submarineState === 'POST_MOVEMENT';
        this.isInteractionLocked = !canInteract;

        // Update all registered buttons based on crossed-off state
        for (const [direction, dirData] of Object.entries(this.engineState)) {
            if (!dirData?.slots) continue;

            for (const [slotId, slotData] of Object.entries(dirData.slots)) {
                const buttonId = `${direction}_${slotId}`;
                const ctrl = this.buttons.get(buttonId);
                if (!ctrl) continue;

                if (slotData.crossedOff) {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                } else if (canInteract && dirData.active) {
                    ctrl.setEnabled(true);
                    ctrl.setActive(true);
                } else {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                }
            }
        }

        // Update reactor buttons
        for (const [reactorId, reactorData] of Object.entries(this.engineState)) {
            if (!reactorId.startsWith('reactor')) continue;
            const ctrl = this.buttons.get(reactorId);
            if (!ctrl) continue;

            if (reactorData.crossedOff) {
                ctrl.setEnabled(false);
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
        this.socketManager.crossOffSystem(direction, slotId);
    }

    handleReactor({ reactorId }) {
        console.log(`[EngineerController] Toggle reactor: ${reactorId}`);
    }

    handleDirectorCmd(cmd) {
        console.log(`[EngineerController] Director command:`, cmd);
        // Process Director-injected commands
        if (cmd.type === 'stateUpdate') {
            this.onGameStateUpdate(cmd.payload);
        }
    }
}
