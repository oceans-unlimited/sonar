import { LayoutContainer } from '@pixi/layout/components';
import { interruptManager } from './InterruptManager.js';
import { interruptController } from './InterruptController.js';
import { wireButton } from '../../behavior/buttonBehavior.js';
import { buildPanel } from './interruptPanelRenderer.js';

/**
 * InterruptOverlay
 * Thin lifecycle shell. Subscribes to interruptManager events,
 * delegates rendering to interruptPanelRenderer, and wires behaviors
 * on the returned content.
 */
export class InterruptOverlay extends LayoutContainer {
    /**
     * @param {import('pixi.js').Ticker} ticker - The application ticker.
     * @param {string} role - Local player role key (co, xo, eng, sonar).
     */
    constructor(ticker, role = null) {
        super();
        this.label = 'interruptOverlay';
        this.ticker = ticker;
        this._role = role;

        this.layout = {
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        };

        this.visible = false;
        this.eventMode = 'none';

        this._setupListeners();
    }

    _setupListeners() {
        this._handleInterrupt = this._handleInterrupt.bind(this);
        interruptManager.subscribe(this._handleInterrupt);
    }

    _handleInterrupt(event, interrupt) {
        if (event === 'interruptStarted') {
            this.show(interrupt);
        } else if (event === 'interruptEnded' || event === 'interruptResolved') {
            this.hide();
        } else if (event === 'interruptUpdated') {
            this.refresh(interrupt);
        }
    }

    destroy(options) {
        interruptManager.unsubscribe(this._handleInterrupt);
        super.destroy(options);
    }

    /**
     * Properly destroys our added panel to free WASM memory in @pixi/layout.
     * We track the panel explicitly to avoid destroying LayoutContainer's internal children (background, mask, etc).
     */
    _clearAndDestroy() {
        if (this._currentPanel) {
            this.removeChild(this._currentPanel);
            if (this._currentPanel.destroy) {
                this._currentPanel.destroy({ children: true });
            }
            this._currentPanel = null;
        }
    }

    /**
     * Renders the interrupt panel via the stateless renderer,
     * then wires any interactive elements.
     * @param {object} interrupt - { type, payload }
     */
    show(interrupt) {
        if (!interrupt || !interrupt.type) return;
        this._clearAndDestroy();
        this.visible = true;

        // 1. Delegate rendering to stateless panel renderer
        const panel = buildPanel(interrupt, this._role);

        // 2. Wire behaviors on labelled interactive children
        this._wireInteractiveNodes(panel);

        this._currentPanel = panel;
        this.addChild(panel);
    }

    hide() {
        this.visible = false;
        this.eventMode = 'none';
        this._clearAndDestroy();
    }

    refresh(interrupt) {
        if (this.visible && interrupt) {
            this.show(interrupt);
        }
    }

    /**
     * Finds labelled interactive nodes in the rendered panel and wires behaviors.
     * @param {LayoutContainer} panel 
     */
    _wireInteractiveNodes(panel) {
        // READY button (standard resume signal)
        const readyBtn = panel.getChildByLabel('interrupt_ready_btn', true);
        if (readyBtn) {
            wireButton(readyBtn, {
                id: 'interrupt_ready_btn',
                onPress: () => interruptController.readyInterrupt()
            });
        }

        // Submit button (Captain sonar response — routes through same ready path for now)
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
}
