import * as PIXI from "pixi.js";
import { buildInterruptLayers } from "./interruptLayers.js";
import { buildInterruptButtons } from "./interruptButtons.js";

/**
 * Interrupt Renderer
 * Responsible ONLY for drawing interrupt UI elements.
 * Strictly stateless.
 */
export function renderInterruptUI(app, options = {}) {
    const root = new PIXI.Container();
    root.label = "interrupt_root";

    const layers = buildInterruptLayers();
    root.addChild(layers.primary);

    const buttons = buildInterruptButtons(options);
    layers.primary.addChild(buttons.container);

    root.interruptButtons = buttons;

    // Center the background in the overlay root if no position provided
    if (options.center) {
        layers.primary.position.set(
            (app.screen.width - 420) / 2,
            (app.screen.height - 120) / 2
        );
    }

    return root;
}
