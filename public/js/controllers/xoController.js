import { createButtonStateManager } from "../ui/behaviors/buttonStateManager.js";
import { applyTintColor } from "../ui/effects/glowEffect.js";
import { SystemColors } from "../core/uiStyle.js";
import { simulationClock } from "../core/clock/simulationClock.js";
import { interruptManager } from "../features/interrupts/InterruptManager.js";
import { getInterruptUIOptions } from "../renderers/interrupts/interruptUIConfigs.js";
import { socketManager } from "../core/socketManager.js";

/**
 * XO Controller
 * Handles logic for the XO (First Officer) scene.
 * Manages subsystem levels and visual states using ButtonStateManagers.
 */
export class XOController {
    constructor(app, renderer) {
        this.app = app;
        this.renderer = renderer;
        this.subsystemLevels = {
            sonar: 0,
            drone: 0,
            mine: 0,
            torpedo: 0,
            silence: 0,
            scenario: 0
        };
        this.maxLevels = {
            sonar: 4,
            drone: 3,
            mine: 3,
            torpedo: 3,
            silence: 6,
            scenario: 4
        };
        this.stateManagers = new Map(); // key -> { icon, gauge }
    }

    init() {
        console.log("[XOController] Initialized.");

        // Attach ButtonStateManagers to each subsystem row's icon and gauge
        this.renderer.views.subsystems.forEach((row, key) => {
            const iconSM = createButtonStateManager(row.iconSprite, this.app, this.renderer.assets.disabled);
            const gaugeSM = createButtonStateManager(row.gaugeSprite, this.app, this.renderer.assets.disabled);

            this.stateManagers.set(key, { icon: iconSM, gauge: gaugeSM });

            // Attach interactions directly in the controller
            row.eventMode = 'static';
            row.cursor = 'pointer';
            row.on('pointerdown', () => this.handleSubsystemClick(key));
        });

        // Default initial state is 'disabled' (already set by createButtonStateManager)
        // We also need to ensure the fills are hidden
        this.renderer.views.subsystems.forEach((row, key) => {
            this.updateFills(key);
        });

        // Relocated M key handling (mock move)
        this._onKeyDown = (e) => {
            if (e.code === 'KeyM') {
                e.preventDefault();
                this.handleMove();
            }
        };
        window.addEventListener('keydown', this._onKeyDown);

        // 3. Socket Handling
        socketManager.on('stateUpdate', (state) => this.handleStateUpdate(state));
        if (socketManager.lastState) this.handleStateUpdate(socketManager.lastState);

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

                const baseOptions = getInterruptUIOptions(interrupt, isReady, 'xo');


                // XO has Ready/Quit but no Surrender
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

        // Sync levels
        Object.keys(this.subsystemLevels).forEach(key => {
            if (mySub.actionGauges[key] !== undefined) {
                this.subsystemLevels[key] = mySub.actionGauges[key];
                this.updateFills(key);
            }
        });

        const isLive = state.phase === 'LIVE';
        const isPostMove = mySub.submarineState === 'POST_MOVEMENT';
        const hasCharged = isPostMove && mySub.submarineStateData.POST_MOVEMENT?.xoChargedGauge;
        const isClockRunning = simulationClock.isRunning();

        this.renderer.views.subsystems.forEach((row, key) => {
            const isFull = this.subsystemLevels[key] >= this.maxLevels[key];

            if (!isLive || !isClockRunning) {
                this.setRowDisabled(key);
                return;
            }

            if (isPostMove) {
                if (hasCharged) {
                    this.setRowDisabled(key);
                } else {
                    if (isFull) {
                        this.setRowDisabled(key); // Cannot charge if already full
                    } else {
                        this.setRowActive(key);
                        // Optional: pulse highlight to indicate action required?
                    }
                }
            } else {
                // NORMAL LIVE STATE
                if (isFull) {
                    this.setReadyToDischarge(key);
                } else {
                    this.setRowDisabled(key); // Cannot charge during normal running (CO must move first)
                }
            }
        });
    }

    handleInterruptAction(action) {
        console.log(`[XOController] Interrupt action: ${action}`);
        if (action === 'ready' || action === 'pause') {
            import('../core/socketManager.js').then(m => m.socketManager.readyInterrupt());
        } else if (action === 'quit' || action === 'abort') {
            import('../core/socketManager.js').then(m => m.socketManager.leaveRole());
        }
    }


    updateFills(key) {
        const row = this.renderer.views.subsystems.get(key);
        const level = this.subsystemLevels[key];
        const color = SystemColors[row.iconSprite.systemName || 'text'];

        row.fillSprites.forEach((sprite, index) => {
            sprite.visible = index < level;
            if (sprite.visible) applyTintColor(sprite, color);
        });
    }

    // --- Visual State Helpers ---

    setRowActive(key) {
        const row = this.renderer.views.subsystems.get(key);
        const sm = this.stateManagers.get(key);
        if (!sm) return;

        sm.icon.setActive();
        sm.gauge.setActive();
        row.statusText.visible = false;
        row.fillGlow.off();
        row.statusPulse.off();
    }

    setRowDisabled(key) {
        const row = this.renderer.views.subsystems.get(key);
        const sm = this.stateManagers.get(key);
        if (!sm) return;

        sm.icon.setDisabled();
        sm.gauge.setDisabled();
        row.statusText.visible = false;
        row.fillGlow.off();
        row.statusPulse.off();
    }

    setRowNeutral(key) {
        const sm = this.stateManagers.get(key);
        if (!sm) return;

        sm.icon.setNeutral();
        sm.gauge.setNeutral();
    }

    setReadyToDischarge(key) {
        const row = this.renderer.views.subsystems.get(key);
        const sm = this.stateManagers.get(key);
        if (!sm) return;

        sm.icon.setActive();
        sm.gauge.setActive();
        row.statusText.visible = true;
        row.fillGlow.pulse();
        row.statusPulse.pulse();
    }

    // --- Interaction Logic ---

    handleSubsystemClick(key) {
        if (!simulationClock.isRunning()) return;
        const row = this.renderer.views.subsystems.get(key);
        const level = this.subsystemLevels[key];
        const max = this.maxLevels[key];
        const isFull = level >= max;

        // Interaction Guard: Only 'active' systems or 'full' systems can be clicked
        const sm = this.stateManagers.get(key);
        const isActive = row.iconSprite.eventMode === 'static';

        if (!isActive && !isFull) return;

        if (isFull) {
            this.discharge(key);
            return;
        }

        // 1. Charge (via Server)
        console.log(`[XOController] Requesting charge for ${key}`);
        socketManager.chargeGauge(key);
    }

    discharge(key) {
        console.log(`[XOController] Requesting discharge for ${key}`);
        // TODO: Implement discharge on server
        // For now, it stays a client-side stub or we add a server trigger
        socketManager.socket.emit('discharge_gauge', key);
    }

    handleMove() {
        // This was a legacy mock, no longer needed as we sync from server
    }

    destroy() {
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown);
        }
        // Cleanup state managers if needed (currently they just have tickers)
        this.stateManagers.clear();
    }
}
