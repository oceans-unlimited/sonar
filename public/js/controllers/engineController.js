import { simulationClock } from "../core/clock/simulationClock.js";
import { interruptManager } from "../features/interrupts/InterruptManager.js";
import { getInterruptUIOptions } from "../renderers/interrupts/interruptUIConfigs.js";
import { socketManager } from "../core/socketManager.js";
import { mockLayout } from "../mockEngineLayout.js";

/**
 * Engine Controller
 * Handles logic for the Engineer scene.
 */
export class EngineController {
    constructor(app, renderer) {
        this.app = app;
        this.renderer = renderer;
        this.pushedButtons = new Set(); // Set of "direction_slotId"
        this.currentLayout = mockLayout; // Default to mock
    }

    init() {
        console.log("[EngineController] Initialized.");

        // 1. Interrupt Handling
        interruptManager.subscribe((event, interrupt) => {
            if (event === 'interruptStarted' || event === 'interruptUpdated') {
                this.showInterruptOverlay(interrupt);
            } else if (event === 'interruptEnded') {
                this.hideInterruptOverlay();
            }
        });

        // 2. Renderer Local Events
        if (this.renderer.scene) {
            this.renderer.scene.on('engineer_circuit_press', (data) => {
                this.handleButtonPress(data.direction, data.slotId);
            });
        }

        // 3. Socket Handling
        socketManager.on('stateUpdate', (state) => this.handleStateUpdate(state));
        if (socketManager.lastState) {
            this.handleStateUpdate(socketManager.lastState);
        } else {
            // Initial render with mock if no state
            this.updateRenderer(this.currentLayout, 0, null);
        }
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

    handleStateUpdate(state) {
        if (!state || !socketManager.playerId) return;

        const mySub = state.submarines.find(sub =>
            sub.co === socketManager.playerId ||
            sub.xo === socketManager.playerId ||
            sub.sonar === socketManager.playerId ||
            sub.eng === socketManager.playerId
        );

        if (!mySub) return;

        if (mySub.engineLayout) {
            this.currentLayout = mySub.engineLayout;
        }

        // Sync pushed buttons
        this.pushedButtons.clear();
        if (this.currentLayout && this.currentLayout.crossedOutSlots) {
            this.currentLayout.crossedOutSlots.forEach(slot => {
                this.pushedButtons.add(`${slot.direction}_${slot.slotId}`);
            });
        }

        const movingDirection = mySub.submarineState === 'POST_MOVEMENT' ?
            mySub.submarineStateData.POST_MOVEMENT?.directionMoved : null;

        this.updateRenderer(this.currentLayout, mySub.hullDamage, movingDirection);
    }

    updateRenderer(layout, hullDamage, movingDirection) {
        this.renderer.scene.emit('update_engine_view', {
            pushedButtons: this.pushedButtons,
            engineLayout: layout,
            hullDamage: hullDamage,
            movingDirection: movingDirection
        });
    }

    handleInterruptAction(action) {
        console.log(`[EngineController] Interrupt action: ${action}`);
        if (action === 'ready' || action === 'pause') {
            import('../core/socketManager.js').then(m => m.socketManager.readyInterrupt());
        } else if (action === 'quit' || action === 'abort') {
            import('../core/socketManager.js').then(m => m.socketManager.leaveRole());
        }
    }


    handleButtonPress(direction, slotId) {
        if (!simulationClock.isRunning()) return;

        const state = socketManager.lastState;
        if (!state) return;

        const mySub = state.submarines.find(sub => sub.eng === socketManager.playerId);
        if (!mySub || mySub.submarineState !== 'POST_MOVEMENT') return;

        const stateData = mySub.submarineStateData.POST_MOVEMENT;
        if (stateData.engineerCrossedOutSystem || stateData.directionMoved !== direction) {
            console.log(`[EngineController] Cannot cross off ${direction} ${slotId} right now.`);
            return;
        }

        console.log(`[EngineController] Requesting cross-off: ${direction}_${slotId}`);
        socketManager.crossOffSystem(direction, slotId);
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
