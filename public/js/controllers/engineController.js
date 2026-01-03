import { simulationClock } from "../core/clock/simulationClock.js";
import { interruptManager } from "../features/interrupts/InterruptManager.js";
import { getInterruptUIOptions } from "../renderers/interrupts/interruptUIConfigs.js";

/**
 * Engine Controller
 * Handles logic for the Engineer scene.
 */
export class EngineController {
    constructor(app, renderer) {
        this.app = app;
        this.renderer = renderer;
        this.pushedButtons = new Set(); // Set of "direction_slotId"
    }

    init() {
        console.log("[EngineController] Initialized.");

        // Interrupt Handling
        interruptManager.subscribe((event, interrupt) => {
            if (event === 'interruptStarted' || event === 'interruptUpdated') {
                this.showInterruptOverlay(interrupt);
            } else if (event === 'interruptEnded') {
                this.hideInterruptOverlay();
            }
        });
    }

    showInterruptOverlay(interrupt) {
        if (this.renderer.scene) {
            import('../core/socketManager.js').then(({ socketManager }) => {
                const state = socketManager.lastState || {};
                const playerId = socketManager.playerId;
                const isReady = state.ready?.includes(playerId);

                const baseOptions = getInterruptUIOptions(interrupt, isReady, 'eng');


                // Engineer has Ready/Quit but no Surrender
                baseOptions.availableButtons = baseOptions.availableButtons.filter(b => b !== 'surrender');

                this.renderer.scene.emit('show_interrupt_overlay', {
                    ...baseOptions,
                    center: true,
                    onInterrupt: (action) => this.handleInterruptAction(action)
                });
            });
        }
    }

    hideInterruptOverlay() {
        if (this.renderer.scene) {
            this.renderer.scene.emit('hide_interrupt_overlay');
        }
    }

    handleInterruptAction(action) {
        console.log(`[EngineController] Interrupt action: ${action}`);
        if (action === 'ready' || action === 'pause') {
            import('../core/socketManager.js').then(m => m.socketManager.readyInterrupt());
        } else if (action === 'quit' || action === 'abort') {
            import('../core/socketManager.js').then(m => m.socketManager.leaveRole());
        }
    }


    handleButtonPress(direction, slotId, system) {
        if (!simulationClock.isRunning()) return;
        const key = `${direction}_${slotId}`;
        console.log(`[EngineController] Button pressed: ${key} (${system})`);

        if (!this.pushedButtons.has(key)) {
            this.pushedButtons.add(key);

            // Stub socket call
            console.log(`[EngineController] Stub: Pushing button ${key}`);

            // Logic for circuit completion check should move here
            this.checkCircuitCompletion(direction, slotId);
        }
    }

    checkCircuitCompletion(direction, slotId) {
        // This will require the engineLayout data
        console.log("[EngineController] Checking circuit completion (requires layout data)");
    }

    resetAll() {
        this.pushedButtons.clear();
        console.log("[EngineController] Resetting all buttons (Local)");
    }

    // Server-side stubs
    handleDirectionChange(direction) {
        console.log(`[EngineController] Stub: Received direction change: ${direction}`);
        this.renderer.views.directionTemplates.forEach((template, dir) => {
            template.updateDirectionState(dir === direction);
        });
    }
}
