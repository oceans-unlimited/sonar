import * as PIXI from "pixi.js";
import { buildInterruptLayers } from "./interruptLayers.js";
import { buildInterruptButtons } from "./interruptButtons.js";
import { Colors } from "../../core/uiStyle.js";

/**
 * Interrupt Renderer
 * Responsible ONLY for drawing interrupt UI elements.
 * Strictly stateless.
 */
export function renderInterruptUI(app, assets, options = {}) {
    const root = new PIXI.Container();
    root.label = "interrupt_root";

    // Pass assets to layers for effects
    const layers = buildInterruptLayers(assets);
    root.addChild(layers.primary);

    const title = options.title || "INTERRUPT";
    const message = options.message || "Please wait...";
    const availableButtons = options.availableButtons || [];
    const buttonOverrides = options.buttonOverrides || {};

    // Ready/Thumb indicator
    // Show if explicitly requested, OR if isReady is defined AND showReadyIndicator is NOT explicitly false
    const shouldShowThumb = options.showReadyIndicator === true || (typeof options.isReady !== 'undefined' && options.showReadyIndicator !== false);

    if (shouldShowThumb) {
        const thumb = new PIXI.Sprite(assets.thumb);
        thumb.anchor.set(0.5);
        thumb.width = 40;
        thumb.height = 40;
        thumb.position.set(380, 40);
        thumb.tint = options.isReady ? 0x00ff00 : Colors.dim;
        thumb.eventMode = 'static';
        thumb.cursor = 'pointer';
        thumb.on('pointertap', () => options.onInterrupt?.('ready'));
        layers.primary.addChild(thumb);
    }

    // Title
    const titleText = new PIXI.Text({
        text: title,
        style: {
            fontFamily: "Orbitron bold, sans-serif",
            fontSize: 18,
            fill: Colors.text || 0xffffff,
            fontWeight: "bold"
        }
    });
    titleText.position.set(20, 15);
    layers.primary.addChild(titleText);

    // Message
    const msgText = new PIXI.Text({
        text: message,
        style: {
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            fill: 0xcccccc
        }
    });
    msgText.position.set(20, 45);
    layers.primary.addChild(msgText);

    const buttons = buildInterruptButtons({
        app,    // Pass app
        assets, // Pass assets
        onInterrupt: options.onInterrupt,
        availableButtons,
        buttonOverrides
    });


    layers.primary.addChild(buttons.container);
    buttons.container.position.set(0, 80); // Offset buttons down further to avoid thumb overlap

    root.interruptButtons = buttons;

    // Center or align to area
    if (options.center) {
        layers.primary.position.set(
            (app.screen.width - 420) / 2,
            (app.screen.height - 160) / 2
        );
    } else if (options.area === 'control_panel') {
        const padding = 20;
        layers.primary.position.set(
            app.screen.width - 420 - padding,
            (app.screen.height - 160) / 2
        );
        // Disable dimmer for side-panel interrupts to allow map interaction
        if (layers.dimmer) {
            layers.dimmer.visible = false;
            layers.dimmer.eventMode = 'none';
        }
    }


    return root;
}
