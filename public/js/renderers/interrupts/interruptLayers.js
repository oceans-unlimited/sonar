import * as PIXI from "pixi.js";

/**
 * Interrupt Layers
 * Only PRIMARY is implemented for now.
 * Strictly stateless renderer.
 */
export function buildInterruptLayers() {
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
        .roundRect(0, 0, 420, 120, 12)
        .fill({ color: 0x0b1d26, alpha: 0.95 })
        .stroke({ color: 0xffffff, width: 2, alpha: 0.2 });

    bg.position.set(0, 0);
    primary.addChild(bg);

    return {
        primary,
        dimmer,
        background: bg
    };
}
