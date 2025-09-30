// C:/web_dev_ai/sonar/public/js/scenes/connScene.js

import * as PIXI from 'pixi.js';
// TODO: Move these styles to a central uiStyle.js
const Colors = {
    grid: 0x222222,
    sector: 0x00ff00,
    text: 0x00ff00,
};

const Font = {
    family: 'Goldman',
    size: 14,
};

const Layout = {
    margin: 20,
};
// End of styles to move

import { createNoiseOverlay, createScanlinesOverlay, applyFlickerEffect } from '../core/uiEffects.js';

export function createConnScene(app, assets) {
    const scene = new PIXI.Container();

    const GRID_SIZE = 15;
    const TILE_SIZE = 32;
    const MAP_WIDTH = GRID_SIZE * TILE_SIZE;
    const MAP_HEIGHT = GRID_SIZE * TILE_SIZE;

    // Map container for scrolling
    const mapContainer = new PIXI.Container();
    scene.addChild(mapContainer);

    // --- Map Sprites ---
    const mapGrid = new PIXI.Container();
    const backgroundTextures = [
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(0, 0, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE * 2, 0, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(0, TILE_SIZE, TILE_SIZE, TILE_SIZE) }),
    ];

    const foregroundTextures = [
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE * 2, TILE_SIZE, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(0, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE) }),
        new PIXI.Texture({ source: assets.map_sprites.source, frame: new PIXI.Rectangle(0, TILE_SIZE * 3, TILE_SIZE, TILE_SIZE) }),
    ];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const randomTexture = backgroundTextures[Math.floor(Math.random() * backgroundTextures.length)];
            const tile = new PIXI.Sprite(randomTexture);
            tile.x = col * TILE_SIZE;
            tile.y = row * TILE_SIZE;
            mapGrid.addChild(tile);

            // Add a small circular dot at the center of each grid space
            const dot = new PIXI.Graphics();
            dot.circle(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, 2)
                .fill({ color: Colors.grid, alpha: 0.5 });
            mapGrid.addChild(dot);
        }
    }

    // Add a few random foreground sprites
    for (let i = 0; i < 5; i++) {
        const randomRow = Math.floor(Math.random() * GRID_SIZE);
        const randomCol = Math.floor(Math.random() * GRID_SIZE);
        const randomTexture = foregroundTextures[Math.floor(Math.random() * foregroundTextures.length)];
        const foregroundSprite = new PIXI.Sprite(randomTexture);
        foregroundSprite.x = randomCol * TILE_SIZE;
        foregroundSprite.y = randomRow * TILE_SIZE;
        mapGrid.addChild(foregroundSprite);
    }

    mapContainer.addChild(mapGrid);

    // --- Overlay Grid ---
    const overlay = new PIXI.Container();
    mapContainer.addChild(overlay);

    const gridLines = new PIXI.Graphics();
    overlay.addChild(gridLines);

    // Draw grid lines
    for (let i = 0; i <= GRID_SIZE; i++) {
        gridLines.moveTo(i * TILE_SIZE, 0);
        gridLines.lineTo(i * TILE_SIZE, MAP_HEIGHT);
        gridLines.moveTo(0, i * TILE_SIZE);
        gridLines.lineTo(MAP_WIDTH, i * TILE_SIZE);
    }
    gridLines.stroke({ width: 1, color: Colors.grid, alpha: 0.8 });

    // --- Coordinate Labels ---
    const labelStyle = {
        fontFamily: Font.family,
        fontSize: 14,
        fill: Colors.text,
    };

    // Horizontal labels (A–O)
    for (let i = 0; i < GRID_SIZE; i++) {
        const label = new PIXI.Text({
            text: String.fromCharCode('A'.charCodeAt(0) + i),
            style: labelStyle,
        });
        label.x = i * TILE_SIZE + TILE_SIZE / 2;
        label.y = -20;
        label.anchor.set(0.5);
        overlay.addChild(label);
    }

    // Vertical labels (1–15)
    for (let i = 0; i < GRID_SIZE; i++) {
        const label = new PIXI.Text({ text: String(i + 1), style: labelStyle });
        label.x = -20;
        label.y = i * TILE_SIZE + TILE_SIZE / 2;
        label.anchor.set(0.5);
        overlay.addChild(label);
    }

    // --- Sector Lines and Labels ---
    const sectorLines = new PIXI.Graphics();
    overlay.addChild(sectorLines);
    const sectorLabelStyle = {
        fontFamily: Font.family,
        fontSize: 64,
        fill: { xolor: Colors.sector, alpha: 0.38 }
    };

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const sectorX = j * 5 * TILE_SIZE;
            const sectorY = i * 5 * TILE_SIZE;
            const sectorNum = i * 3 + j + 1;

            sectorLines.rect(sectorX, sectorY, 5 * TILE_SIZE, 5 * TILE_SIZE);

            const label = new PIXI.Text({ text: String(sectorNum), style: sectorLabelStyle });
            label.x = sectorX + (5 * TILE_SIZE) / 2;
            label.y = sectorY + (5 * TILE_SIZE) / 2;
            label.anchor.set(0.5);
            overlay.addChild(label);
        }
    }
    sectorLines.stroke({width: 2, color: Colors.sector, alpha: 1.0});

    // --- Scrolling Logic ---
    mapContainer.eventMode = 'static';
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
            this.x = Math.min(Layout.margin, Math.max(app.screen.width - MAP_WIDTH - Layout.margin, this.x));
            this.y = Math.min(Layout.margin, Math.max(app.screen.height - MAP_HEIGHT - Layout.margin, this.y));
        }
    }

    // Center map
    mapContainer.x = (app.screen.width - MAP_WIDTH) / 2;
    mapContainer.y = (app.screen.height - MAP_HEIGHT) / 2;

    // --- Overlays ---
    const noise = createNoiseOverlay(assets.noise, app);
    const scan = createScanlinesOverlay(assets.scanlines, app);
    scene.addChild(noise, scan);

    // --- Animation ---
    const allText = overlay.children.filter(c => c instanceof PIXI.Text);
    const flickerCallback = applyFlickerEffect(app, allText);

    scene.on('destroyed', () => app.ticker.remove(flickerCallback));

    return scene;
}
