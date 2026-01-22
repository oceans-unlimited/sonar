import * as PIXI from "pixi.js";
import { Colors, Font } from "../core/uiStyle.js";
import { createNoiseOverlay, createScanlinesOverlay } from "../ui/effects/noiseOverlay.js";

/**
 * Universal Panel Renderer
 * Creates a standard control panel with border, title, and optional overlays.
 * Reference: xoScene.js for high-fidelity aesthetics.
 */
export function renderControlPanel(app, assets, config = {}) {
    const {
        name = "",
        color = Colors.border,
        width = 300,
        height = 420,
        showOverlays = true,
        titleSize = 20,
        padding = 10
    } = config;

    const panel = new PIXI.Container();

    // 1. Background (Optional, helps depth)
    const bg = new PIXI.Graphics()
        .rect(0, 0, width, height)
        .fill({ color: Colors.background, alpha: 0.1 }); // Subtle background
    panel.addChild(bg);

    // 2. Border
    const border = new PIXI.Graphics()
        .rect(0, 0, width, height)
        .stroke({ color: color, width: 2 });
    panel.addChild(border);

    // 3. Title
    if (name) {
        const title = new PIXI.Text({
            text: name.toUpperCase(),
            style: {
                fontFamily: Font.family,
                fontSize: titleSize,
                fill: color,
                letterSpacing: 1
            },
        });
        title.x = padding;
        title.y = 8;
        panel.addChild(title);
    }

    // 4. Overlays
    if (showOverlays && assets.noise && assets.scanlines) {
        const noise = createNoiseOverlay(assets.noise, app, width, height);
        const scan = createScanlinesOverlay(assets.scanlines, app, width, height);
        panel.addChild(noise, scan);
    }

    return panel;
}

/**
 * Positions containers in a horizontal landscape-locked layout.
 */
export function positionColumns(container, screenWidth, colWidth, spacing, topOffset = 80) {
    const totalWidth = container.children.length * colWidth + (container.children.length - 1) * spacing;
    const startX = (screenWidth - totalWidth) / 2;

    container.children.forEach((c, i) => {
        c.x = startX + i * (colWidth + spacing);
        c.y = topOffset;
    });
}
