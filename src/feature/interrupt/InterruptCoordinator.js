import { interruptManager } from './InterruptManager.js';
import { interruptController } from './InterruptController.js';
import { wireButton } from '../../behavior/buttonBehavior.js';
import { buildPanel } from './interruptPanelRenderer.js';

/**
 * InterruptCoordinator
 * Non-visual lifecycle coordinator for interrupt context swapping.
 * 
 * Subscribes to interruptManager events and swaps the content inside
 * the scene's control panel swapWrapper. When an interrupt fires,
 * normalContent is hidden and the interrupt panel is shown in its place.
 * When the interrupt ends, normalContent is restored.
 * 
 * This is a plain class — NOT a PixiJS displayObject. It is never
 * added to the scene graph. Instead, it discovers the swapWrapper
 * and normalContent containers by their standardized labels.
 * 
 * Rules:
 * - Never creates Pixi objects directly (delegates to interruptPanelRenderer)
 * - Never calls interruptManager directly (server-driven only)
 * - Wires behaviors on rendered content (ready button, status label)
 */
export class InterruptCoordinator {
    /**
     * @param {import('pixi.js').Ticker} ticker - The application ticker.
     * @param {string} role - Local player role key (co, xo, eng, sonar).
     */
    constructor(ticker, role = null) {
        this.ticker = ticker;
        this._role = role;

        // Scene graph references (resolved on bindView)
        this._swapWrapper = null;
        this._normalContent = null;

        // Active interrupt state
        this._currentPanel = null;
        this._isReady = false;
        this._readyBehavior = null;

        // Bind and subscribe
        this._handleInterrupt = this._handleInterrupt.bind(this);
        interruptManager.subscribe(this._handleInterrupt);
    }

    // ─────────── View Binding ───────────

    /**
     * Resolves the swapWrapper and normalContent containers from the scene graph.
     * Called once by the scene factory after scene construction.
     * @param {import('pixi.js').Container} sceneContent - The root scene container.
     */
    bindView(sceneContent) {
        this._swapWrapper = sceneContent.getChildByLabel('swapWrapper', true);
        if (!this._swapWrapper) {
            console.warn('[InterruptCoordinator] swapWrapper not found in scene graph.');
            return;
        }

        this._normalContent = this._swapWrapper.getChildByLabel('normalContent', false);
        if (!this._normalContent) {
            console.warn('[InterruptCoordinator] normalContent not found inside swapWrapper.');
        }

        console.log(`[InterruptCoordinator] Bound to scene. Role: ${this._role}`);

        // If an interrupt is already active when we bind (e.g., scene loaded during interrupt),
        // show it immediately.
        const active = interruptManager.getActiveInterrupt();
        if (active) {
            this.show(active);
        }
    }

    // ─────────── Event Handling ───────────

    _handleInterrupt(event, interrupt) {
        if (event === 'interruptStarted') {
            this.show(interrupt);
        } else if (event === 'interruptEnded' || event === 'interruptResolved') {
            this.hide();
        } else if (event === 'interruptUpdated') {
            this.refresh(interrupt);
        }
    }

    // ─────────── Context Swap ───────────

    /**
     * Swaps normalContent for the interrupt panel.
     * @param {object} interrupt - { type, payload }
     */
    show(interrupt) {
        if (!interrupt || !interrupt.type) return;
        if (!this._swapWrapper) {
            console.warn('[InterruptCoordinator] Cannot show — not bound to scene.');
            return;
        }

        // Clean up any existing interrupt panel
        this._clearPanel();

        // 1. Hide normal content
        if (this._normalContent) {
            this._normalContent.visible = false;
        }

        // 2. Build interrupt content via stateless renderer
        const panel = buildPanel(interrupt, this._role);
        panel.label = 'interruptContent';

        // 3. Wire interactive nodes
        this._wireInteractiveNodes(panel, interrupt);

        // 4. Add to swap wrapper
        this._currentPanel = panel;
        this._swapWrapper.addChild(panel);

        // Reset ready state
        this._isReady = false;

        console.log(`[InterruptCoordinator] Showing interrupt: ${interrupt.type} (role: ${this._role})`);
    }

    /**
     * Restores normalContent by removing the interrupt panel.
     */
    hide() {
        this._clearPanel();

        // Restore normal content
        if (this._normalContent) {
            this._normalContent.visible = true;
        }

        // Reset state
        this._isReady = false;
        this._readyBehavior = null;

        console.log('[InterruptCoordinator] Hidden — normalContent restored.');
    }

    /**
     * Updates the active interrupt panel when the payload changes.
     * @param {object} interrupt - { type, payload }
     */
    refresh(interrupt) {
        if (!this._currentPanel || !interrupt) return;

        // Update status label if present
        const statusLabel = this._currentPanel.getChildByLabel('interrupt_status_label', true);
        if (statusLabel && interrupt.payload?.statusText) {
            statusLabel.text = interrupt.payload.statusText;
        }

        // Update ready button state based on payload
        if (this._readyBehavior) {
            // If interrupt payload indicates this player's ready state changed
            // (e.g., captain re-selected position, un-readying them)
            const shouldBeReady = interrupt.payload?.isReady ?? this._isReady;
            if (shouldBeReady !== this._isReady) {
                this._isReady = shouldBeReady;
                this._readyBehavior.setActive(this._isReady);
            }

            // Enable/disable ready button based on payload
            if (interrupt.payload?.readyEnabled !== undefined) {
                this._readyBehavior.setEnabled(interrupt.payload.readyEnabled);
            }
        }
    }

    // ─────────── Internal ───────────

    /**
     * Removes and destroys the current interrupt panel from the swapWrapper.
     */
    _clearPanel() {
        if (this._currentPanel && this._swapWrapper) {
            this._swapWrapper.removeChild(this._currentPanel);
            if (this._currentPanel.destroy) {
                this._currentPanel.destroy({ children: true });
            }
            this._currentPanel = null;
        }

        // Clean up wired behavior
        if (this._readyBehavior) {
            this._readyBehavior.destroy();
            this._readyBehavior = null;
        }
    }

    /**
     * Finds labelled interactive nodes in the rendered panel and wires behaviors.
     * @param {import('@pixi/layout/components').LayoutContainer} panel 
     * @param {object} interrupt - { type, payload }
     */
    _wireInteractiveNodes(panel, interrupt) {
        // Universal READY button (toggle behavior)
        const readyBtn = panel.getChildByLabel('interrupt_ready_btn', true);
        if (readyBtn) {
            const behavior = wireButton(readyBtn, {
                id: 'interrupt_ready_btn',
                profile: 'basic',
                onPress: () => {
                    this._isReady = !this._isReady;
                    behavior.setActive(this._isReady);

                    if (this._isReady) {
                        interruptController.readyInterrupt();
                    }
                    // Un-ready is handled by server state update triggering refresh()
                }
            });

            this._readyBehavior = behavior;

            // Initial state: check if ready button should start disabled
            if (interrupt.payload?.readyEnabled === false) {
                behavior.setEnabled(false);
            }
        }

        // Submit button (Sonar response — routes through same ready path for now)
        const submitBtn = panel.getChildByLabel('interrupt_submit_btn', true);
        if (submitBtn) {
            wireButton(submitBtn, {
                id: 'interrupt_submit_btn',
                onPress: () => {
                    // TODO: Collect sonar response data from form and call:
                    // interruptController.submitSonarResponse(data);
                    interruptController.readyInterrupt();
                }
            });
        }
    }

    // ─────────── Cleanup ───────────

    destroy() {
        interruptManager.unsubscribe(this._handleInterrupt);
        this._clearPanel();
        this._swapWrapper = null;
        this._normalContent = null;
        console.log('[InterruptCoordinator] Destroyed.');
    }
}
