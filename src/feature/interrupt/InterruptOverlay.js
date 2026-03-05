import { LayoutContainer } from '@pixi/layout/components';
import { Container, Graphics, Text, Sprite, TextStyle } from 'pixi.js';
import { interruptManager } from './InterruptManager.js';
import { interruptController } from './InterruptController.js';
import { Colors, Fonts } from '../../core/uiStyle.js';
import { createButtonFromDef } from '../../render/button.js';
import { wireButton } from '../../behavior/buttonBehavior.js';

/**
 * InterruptOverlay
 * Full-screen layout container that displays active interrupt information.
 */
export class InterruptOverlay extends LayoutContainer {
    constructor(ticker) {
        super();
        this.label = 'interruptOverlay';
        this.ticker = ticker;

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
        this.eventMode = 'none'; // Pass events through to map by default

        this._setupListeners();
    }

    _setupListeners() {
        interruptManager.subscribe((event, interrupt) => {
            if (event === 'interruptStarted') {
                this.show(interrupt);
            } else if (event === 'interruptEnded' || event === 'interruptResolved') {
                this.hide();
            } else if (event === 'interruptUpdated') {
                this.refresh(interrupt);
            }
        });
    }

    show(interrupt) {
        if (!interrupt || !interrupt.type) return;
        this.removeChildren();
        this.visible = true;

        const panel = new LayoutContainer({
            label: 'interruptPanel',
            layout: {
                width: 400,
                height: 'auto',
                padding: 20,
                backgroundColor: 0x051505,
                backgroundAlpha: 0.9,
                borderColor: Colors.text,
                borderWidth: 2,
                borderRadius: 8,
                flexDirection: 'column',
                alignItems: 'center',
                gap: 15
            }
        });
        panel.eventMode = 'static'; // Panel itself should block events

        // Title
        const titleText = new Text({
            text: interrupt.type.replace(/_/g, ' '),
            style: new TextStyle({
                fontFamily: Fonts.header,
                fontSize: 24,
                fill: Colors.text,
                fontWeight: 'bold',
                letterSpacing: 2
            }),
            layout: { marginBottom: 5 }
        });
        panel.addChild(titleText);

        // Message
        const message = interrupt.payload?.message || "SYSTEM INTERRUPT ACTIVE";
        const msgText = new Text({
            text: message,
            style: new TextStyle({
                fontFamily: Fonts.primary,
                fontSize: 16,
                fill: 0xcccccc,
                align: 'center'
            })
        });
        panel.addChild(msgText);

        // Ready Button (if applicable)
        if (this._shouldShowReadyButton(interrupt.type)) {
            const btn = createButtonFromDef({
                asset: 'pause', // Standard pause/play icon for resume
                color: Colors.text,
                profile: 'frame',
                textLabel: 'READY'
            });

            const wired = wireButton(btn, {
                id: 'interrupt_ready_btn',
                event: 'READY_INTERRUPT',
                preset: 'TOGGLE'
            }, (event, data) => {
                // Route through the feature controller
                interruptController.readyInterrupt();
            }, this.ticker);

            panel.addChild(btn);
        }

        this.addChild(panel);
    }

    hide() {
        this.visible = false;
        this.eventMode = 'none';
        this.removeChildren();
    }

    refresh(interrupt) {
        // Refresh content if visible
        if (this.visible && interrupt) {
            this.show(interrupt);
        }
    }

    _shouldShowReadyButton(type) {
        const manualTypes = ['PAUSE', 'START_POSITIONS', 'PLAYER_DISCONNECT', 'SONAR_PING'];
        return manualTypes.includes(type);
    }
}
