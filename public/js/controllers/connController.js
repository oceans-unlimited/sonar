/**
 * Conn Controller
 * Handles logic for the Captain's scene.
 */
import { simulationClock } from "../core/clock/simulationClock.js";
import { interruptManager } from "../features/interrupts/InterruptManager.js";
import { interruptController } from "../features/interrupts/InterruptController.js";
import { getInterruptUIOptions } from "../renderers/interrupts/interruptUIConfigs.js";
import { createButtonStateManager } from "../ui/behaviors/buttonStateManager.js";
import { socketManager } from "../core/socketManager.js";

export class ConnController {
    constructor(app, renderer, mapSystem) {
        this.app = app;
        this.renderer = renderer;
        this.mapSystem = mapSystem;
        this.helmStateManagers = new Map();
    }

    init() {
        console.log("[ConnController] Initialized.");

        const IS_MOBILE = this.app.screen.width < 800;
        const CONTROLS_WIDTH = IS_MOBILE ? 270 : 300;

        // Correctly calculate map view area (Screen Width - Sidebar Width)
        const viewWidth = this.app.screen.width - CONTROLS_WIDTH;

        // 1. Initialize Map
        this.mapSystem.init({
            width: viewWidth,
            height: this.app.screen.height
        });

        // 2. Attach Logic Interactions
        // Helm Directions
        const helmButtons = this.renderer.views.helmButtons;
        helmButtons.forEach((btn, dir) => {
            const sm = createButtonStateManager(btn, this.app, this.renderer.assets.disabled);
            this.helmStateManagers.set(dir, sm);

            btn.on('pointerdown', () => {
                this.handleMove(dir);
            });
        });

        // Default state
        this.updateMovementUI(socketManager.lastState);

        // System Rows (Torpedo/Mine/Vessel)
        const systemRows = this.renderer.views.systemRows;
        systemRows.forEach((row, systemKey) => {
            row.btn1.on('pointerdown', () => this.handleSystemAction(systemKey, 0));
            row.btn2.on('pointerdown', () => this.handleSystemAction(systemKey, 1));
        });

        // 3. Socket Handling
        socketManager.on('stateUpdate', (state) => {
            this.updateMovementUI(state);
        });

        // 3. Interrupt Handling
        interruptManager.subscribe((event, interrupt) => {
            if (event === 'interruptStarted' || event === 'interruptUpdated') {
                this.showInterruptOverlay(interrupt);
            } else if (event === 'interruptEnded') {
                this.hideInterruptOverlay();
            }
        });

        // Check for existing interrupt on load (e.g., scene transition during interrupt)
        // Delay slightly to ensure scene is ready to receive events
        setTimeout(() => {
            const activeInterrupt = interruptManager.getActiveInterrupt();
            if (activeInterrupt) {
                this.showInterruptOverlay(activeInterrupt);
            }
        }, 100);
    }

    showInterruptOverlay(interrupt) {
        if (this.renderer.scene) {
            import('../core/socketManager.js').then(({ socketManager }) => {
                const state = socketManager.lastState || {};
                const playerId = socketManager.playerId;
                const isReady = state.ready?.includes(playerId);

                const baseOptions = getInterruptUIOptions(interrupt, isReady, 'co');


                const isStartPositions = interrupt.type === 'START_POSITIONS';

                this.renderer.scene.emit('show_interrupt_overlay', {
                    ...baseOptions,
                    center: !isStartPositions, // strict boolean
                    area: isStartPositions ? 'control_panel' : undefined,
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
        console.log(`[ConnController] Interrupt action: ${action}`);
        if (action === 'pause' || action === 'ready') {
            import('../core/socketManager.js').then(m => m.socketManager.readyInterrupt());
        } else if (action === 'submit') {
            // Mock sonar submission
            const mockResponse = "ROW 4, SECTOR 2";
            import('../core/socketManager.js').then(m => m.socketManager.submitSonarResponse(mockResponse));
        } else if (action === 'abort' || action === 'quit') {
            import('../core/socketManager.js').then(m => m.socketManager.leaveRole());
        }
    }


    handleMove(direction) {
        if (!simulationClock.isRunning()) return;

        const state = socketManager.lastState;
        if (!state) return;

        const mySub = state.submarines.find(sub => sub.co === socketManager.playerId);
        if (!mySub || mySub.submarineState !== 'SUBMERGED') return;

        console.log(`[ConnController] Moving ${direction}`);
        this.mapSystem.controller.sendMove(direction);
    }

    updateMovementUI(state) {
        if (!state || !socketManager.playerId) return;

        const mySub = state.submarines.find(sub => sub.co === socketManager.playerId);
        if (!mySub) return;

        const isLive = state.phase === 'LIVE';
        const isSubmerged = mySub.submarineState === 'SUBMERGED';
        const isClockRunning = simulationClock.isRunning();

        this.helmStateManagers.forEach((sm, dir) => {
            if (!isLive || !isSubmerged || !isClockRunning) {
                sm.setDisabled();
                return;
            }

            // Check validity
            const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };
            const lastMove = mySub.submarineStateData.POST_MOVEMENT?.directionMoved;

            // 1. Cannot reverse
            if (lastMove && lastMove !== ' ' && dir === opposite[lastMove]) {
                sm.setDisabled();
                return;
            }

            const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
            const colDeltas = { N: 0, S: 0, E: 1, W: -1 };
            const newRow = mySub.row + rowDeltas[dir];
            const newCol = mySub.col + colDeltas[dir];

            // 2. Bounds
            const withinBounds = 0 <= newRow && newRow < state.board.length && 0 <= newCol && newCol < state.board[0].length;
            if (!withinBounds) {
                sm.setDisabled();
                return;
            }

            // 3. Water
            if (state.board[newRow][newCol] !== 0) { // 0 is WATER (constant W=0)
                sm.setDisabled();
                return;
            }

            // 4. Past Track
            const inTrack = mySub.pastTrack && mySub.pastTrack.some(pos => pos.row === newRow && pos.col === newCol);
            if (inTrack) {
                sm.setDisabled();
                return;
            }

            sm.setActive();
        });
    }

    handleSystemAction(system, actionIndex) {
        if (!simulationClock.isRunning()) {
            // If already paused, clicking pause again might be intended to resume?
            // But usually we use the overlay buttons for that.
            return;
        }

        if (system === 'vessel' && actionIndex === 0) {
            console.log("[ConnController] Requesting PAUSE");
            interruptController.requestPause();
            return;
        }

        console.log(`[ConnController] Stub: System ${system} Action ${actionIndex}`);
    }
}
