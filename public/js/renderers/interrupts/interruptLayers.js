import * as PIXI from "pixi.js";
import { createNoiseOverlay, createScanlinesOverlay } from "../../ui/effects/noiseOverlay.js";

/**
 * Interrupt Layers
 * Only PRIMARY is implemented for now.
 * Strictly stateless renderer.
 */
export function buildInterruptLayers(assets) {
    const primary = new PIXI.Container();
    primary.label = "interrupt_primary";

    // Dimming background (covers whole screen)
    const dimmer = new PIXI.Graphics()
        .rect(0, 0, 4000, 4000) // Large enough to cover anything
        .fill({ color: 0x000000, alpha: 0.5 });
    dimmer.position.set(-2000, -2000); // Center roughly if needed
    dimmer.eventMode = 'static'; // Block interactions below
    primary.addChild(dimmer);

    // Subtle background panel (centered in the primary container)
    const bg = new PIXI.Graphics()
        .roundRect(0, 0, 420, 160, 12) // Slightly taller to account for message/thumb
        .fill({ color: 0x011401, alpha: 0.95 }) // Darker green background
        .stroke({ color: 0x28ee28, width: 2, alpha: 0.3 });

    bg.position.set(0, 0);
    primary.addChild(bg);

    // Add noise and scanlines to the panel
    if (assets) {
        const noise = createNoiseOverlay(assets.noise, null, 420, 160);
        const scan = createScanlinesOverlay(assets.scanlines, null, 420, 160);
        primary.addChild(noise, scan);
    }

    return {
        primary,
        dimmer,
        background: bg
    };
}
