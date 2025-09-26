// C:/web_dev_ai/sonar/public/js/scenes/connScene.js

import * as PIXI from 'pixi.js';
// TODO: Move these styles to a central uiStyle.js
const Colors = {
    grid: 0x444444,
    sector: 0x00ff00,
    text: 0x00ff00,
};

const Font = {
    family: 'Goldman',
    size: 14,
};

const Layout = {
    margin: 20,
}
// End of styles to move

import { createNoiseOverlay, createScanlinesOverlay, applyFlickerEffect } from '../core/uiEffects.js';

/**
 * Creates the main game scene for the Captain role.
 * @param {PIXI.Application} app - The PIXI Application instance.
 * @param {object} assets - The loaded game assets.
 * @returns {PIXI.Container} The scene container.
 */
export function createConnScene(app, assets) {
    const scene = new PIXI.Container();

    const GRID_SIZE = 15;
    const TILE_SIZE = 32;
    const MAP_WIDTH = GRID_SIZE * TILE_SIZE;
    const MAP_HEIGHT = GRID_SIZE * TILE_SIZE;

    // Map container for scrolling
    const mapContainer = new PIXI.Container();
    scene.addChild(mapContainer);

    // --- Map Sprites (Placeholders) ---
    const mapGrid = new PIXI.Container();
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const tile = new PIXI.Graphics();
            tile.beginFill(0x0b1e2d); // Dark blue placeholder from gameCanvas background
            tile.drawRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            tile.endFill();
            mapGrid.addChild(tile);

            // Add a small circular dot at the center of each grid space
            const dot = new PIXI.Graphics();
            dot.beginFill(Colors.grid, 0.5);
            dot.drawCircle(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, 2);
            dot.endFill();
            mapGrid.addChild(dot);
        }
    }
    mapContainer.addChild(mapGrid);

    // --- Overlay Grid ---
    const overlay = new PIXI.Container();
    mapContainer.addChild(overlay);

    const gridLines = new PIXI.Graphics();
    overlay.addChild(gridLines);

    // Draw grid lines
    gridLines.lineStyle(1, Colors.grid, 0.5);
    for (let i = 0; i <= GRID_SIZE; i++) {
        gridLines.moveTo(i * TILE_SIZE, 0);
        gridLines.lineTo(i * TILE_SIZE, MAP_HEIGHT);
        gridLines.moveTo(0, i * TILE_SIZE);
        gridLines.lineTo(MAP_WIDTH, i * TILE_SIZE);
    }

    // --- Coordinate Labels ---
    const labelStyle = {
        fontFamily: Font.family,
        fontSize: 14,
        fill: Colors.text,
        alpha: 0.6,
    };

    // Horizontal labels (A-O)
    for (let i = 0; i < GRID_SIZE; i++) {
        const label = new PIXI.Text(String.fromCharCode('A'.charCodeAt(0) + i), labelStyle);
        label.x = i * TILE_SIZE + TILE_SIZE / 2;
        label.y = -20;
        label.anchor.set(0.5);
        overlay.addChild(label);
    }

    // Vertical labels (1-15)
    for (let i = 0; i < GRID_SIZE; i++) {
        const label = new PIXI.Text(String(i + 1), labelStyle);
        label.x = -20;
        label.y = i * TILE_SIZE + TILE_SIZE / 2;
        label.anchor.set(0.5);
        overlay.addChild(label);
    }

    // --- Sector Lines and Labels ---
    const sectorLabelStyle = {
        fontFamily: Font.family,
        fontSize: 64,
        fill: Colors.sector,
        alpha: 0.15,
    };

    gridLines.lineStyle(1, Colors.sector, 0.5);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const sectorX = j * 5 * TILE_SIZE;
            const sectorY = i * 5 * TILE_SIZE;
            const sectorNum = i * 3 + j + 1;

            gridLines.drawRect(sectorX, sectorY, 5 * TILE_SIZE, 5 * TILE_SIZE);

            const label = new PIXI.Text(String(sectorNum), sectorLabelStyle);
            label.x = sectorX + (5 * TILE_SIZE) / 2;
            label.y = sectorY + (5 * TILE_SIZE) / 2;
            label.anchor.set(0.5);
            overlay.addChild(label);
        }
    }

    // --- Scrolling Logic ---
    mapContainer.eventMode = 'static'; // Enable interaction
    mapContainer.on('pointerdown', onDragStart, mapContainer);
    mapContainer.on('pointerup', onDragEnd, mapContainer);
    mapContainer.on('pointerupoutside', onDragEnd, mapContainer);
    mapContainer.on('pointermove', onDragMove, mapContainer);

    let dragging = false;
    let dragStart = new PIXI.Point();
    let dragStartPos = new PIXI.Point();

    function onDragStart(event) {
        dragging = true;
        dragStart.copyFrom(event.global);
        dragStartPos.copyFrom(this.position);
    }

    function onDragEnd() {
        dragging = false;
    }

    function onDragMove(event) {
        if (dragging) {
            const newPos = event.global;
            const dx = newPos.x - dragStart.x;
            const dy = newPos.y - dragStart.y;

            this.x = dragStartPos.x + dx;
            this.y = dragStartPos.y + dy;

            // Clamp position
            this.x = Math.min(Layout.margin, Math.max(app.screen.width - MAP_WIDTH - Layout.margin, this.x));
            this.y = Math.min(Layout.margin, Math.max(app.screen.height - MAP_HEIGHT - Layout.margin, this.y));
        }
    }

    // Center the map initially
    mapContainer.x = (app.screen.width - MAP_WIDTH) / 2;
    mapContainer.y = (app.screen.height - MAP_HEIGHT) / 2;

    // --- Overlays ---
    // Assumes 'noise' and 'scanlines' are loaded into assets
    const noise = createNoiseOverlay(assets.noise, app);
    const scan = createScanlinesOverlay(assets.scanlines, app);
    scene.addChild(noise, scan);

    // --- Animation ---
    const allText = overlay.children.filter(c => c instanceof PIXI.Text);
    const flickerCallback = applyFlickerEffect(app, allText);

    scene.on('destroyed', () => {
        app.ticker.remove(flickerCallback);
    });

    return scene;
}
