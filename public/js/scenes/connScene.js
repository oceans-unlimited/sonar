// public/js/scenes/connScene.js

import * as PIXI from 'pixi.js';
import { Colors, Font, SystemColors, Layout } from '../core/uiStyle.js';
import { createNoiseOverlay, createScanlinesOverlay, applyFlickerEffect, applyTintColor } from '../core/uiEffects.js';
import { MapRenderer } from '../renderers/mapRenderer.js';

export function createConnScene(app, assets) {
    const root = new PIXI.Container();
    const scene = new PIXI.Container();
    root.addChild(scene);

    // --- Background ---
    const bg = new PIXI.Graphics()
        .rect(0, 0, app.screen.width, app.screen.height)
        .fill({ color: Colors.background, alpha: 0.95 });
    scene.addChild(bg);

    // --- Layout Constants (based on SVG) ---
    const IS_MOBILE = app.screen.width < 800;
    const CONTROLS_WIDTH = IS_MOBILE ? 270 : 300;
    const DRAWER_PEEK = 40; // How much the drawer peeks out when closed

    // --- Map View Window ---
    const mapViewWindow = new PIXI.Container();
    mapViewWindow.x = 0;
    mapViewWindow.y = 0;
    scene.addChild(mapViewWindow);

    const windowWidth = IS_MOBILE ? app.screen.width : app.screen.width - CONTROLS_WIDTH;
    const windowHeight = app.screen.height;

    // --- Map Renderer Integration ---
    const mapRenderer = new MapRenderer(app, assets, {
        gridSize: 15,
        tileSize: 90
    });
    mapViewWindow.addChild(mapRenderer.container);
    mapRenderer.setMask(0, 0, windowWidth, windowHeight);
    mapRenderer.centerOnPosition({ x: 7, y: 7 }); // Start centered

    // --- Overlays (Grid, Data) ---
    // Note: Grid coordinate labels are now handled internally by MapRenderer.
    // Position/Target Data Overlay and other UI elements are initialized below.

    // --- Controls Drawer ---
    const controls = new PIXI.Container();
    controls.x = app.screen.width - (IS_MOBILE ? DRAWER_PEEK : CONTROLS_WIDTH);
    scene.addChild(controls);

    const controlsBg = new PIXI.Graphics()
        .rect(0, 0, CONTROLS_WIDTH, app.screen.height)
        .fill({ color: Colors.background, alpha: 0.9 })
        .stroke({ color: Colors.border, width: 2 });
    controls.addChild(controlsBg);

    // Drawer Logic
    let drawerOpen = true; // Default open

    const toggleDrawer = (open) => {
        drawerOpen = open;
        const targetX = open ? app.screen.width - CONTROLS_WIDTH : app.screen.width - DRAWER_PEEK;
        // Simple animation (direct assignment for now, could be tweened)
        controls.x = targetX;
    };

    // Auto-hide drawer on map drag
    mapRenderer.onStartDrag = () => {
        if (drawerOpen) toggleDrawer(false);
    };

    mapRenderer.onInactivity = () => {
        if (!drawerOpen) toggleDrawer(true);
    };

    // --- Game Info Header (Inside Drawer) ---
    const game_info = new PIXI.Container();
    game_info.x = 0;
    game_info.y = 10;
    controls.addChild(game_info);

    // Sub Profile
    const subProfile = new PIXI.Sprite(assets.sub_profileA);
    subProfile.scale.set(0.6);
    subProfile.x = 10;
    subProfile.y = 0;
    game_info.addChild(subProfile);

    const subLabel = new PIXI.Text({
        text: 'USS OKLAHOMA',
        style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
    });
    subLabel.x = 10;
    subLabel.y = 37;
    game_info.addChild(subLabel);

    // Captain Badge
    const cptBadge = new PIXI.Sprite(assets.captain_badge);
    cptBadge.scale.set(1); // Increased scale to match profile
    cptBadge.anchor.set(1, 0);
    cptBadge.x = CONTROLS_WIDTH - 10;
    cptBadge.y = 0;
    game_info.addChild(cptBadge);

    const cptLabel = new PIXI.Text({
        text: 'COMMANDER',
        style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
    });
    cptLabel.anchor.set(1, 0);
    cptLabel.x = CONTROLS_WIDTH - 10;
    cptLabel.y = 37;
    game_info.addChild(cptLabel);

    // --- Buttons Container ---
    const buttonsContainer = new PIXI.Container();
    buttonsContainer.x = 20;
    buttonsContainer.y = 80;
    controls.addChild(buttonsContainer);

    // 1. Helm Control (D-Pad style)
    const helmContainer = new PIXI.Container();
    helmContainer.y = 0;
    buttonsContainer.addChild(helmContainer);

    const dpadSize = 40;
    const dpadSpacing = 45;
    const directions = [
        { label: 'N', x: dpadSpacing, y: 0 },
        { label: 'W', x: 0, y: dpadSpacing },
        { label: 'E', x: dpadSpacing * 2, y: dpadSpacing },
        { label: 'S', x: dpadSpacing, y: dpadSpacing * 2 }
    ];

    directions.forEach(dir => {
        const dBtn = new PIXI.Container();
        dBtn.x = dir.x + (CONTROLS_WIDTH - 40 - dpadSpacing * 3) / 2;
        dBtn.y = dir.y;

        const bg = new PIXI.Graphics()
            .roundRect(0, 0, dpadSize, dpadSize, 4)
            .fill({ color: Colors.border, alpha: 0.8 })
            .stroke({ color: Colors.text, width: 1 });

        const t = new PIXI.Text({ text: dir.label, style: { fontFamily: Font.family, fontSize: 16, fill: Colors.text } });
        t.anchor.set(0.5);
        t.x = dpadSize / 2;
        t.y = dpadSize / 2;

        dBtn.addChild(bg, t);
        dBtn.eventMode = 'static';
        dBtn.cursor = 'pointer';
        helmContainer.addChild(dBtn);
    });

    const helmOffset = 150;
    const rowWidth = CONTROLS_WIDTH - 40;

    // Row 1: Torpedo
    const torpedoRow = createControlRow(
        'TORPEDO',
        assets.torpedo_sys,
        assets.button,
        [SystemColors.weapons, SystemColors.weapons, SystemColors.weapons],
        rowWidth
    );
    torpedoRow.y = helmOffset;
    buttonsContainer.addChild(torpedoRow);

    // Row 2: Mine
    const mineRow = createControlRow(
        'MINE',
        assets.mine_sys,
        assets.button,
        [SystemColors.weapons, SystemColors.weapons, SystemColors.weapons],
        rowWidth
    );
    mineRow.y = helmOffset + 80;
    buttonsContainer.addChild(mineRow);

    // Row 3: Vessel (Stealth)
    const vesselRow = createControlRow(
        'VESSEL',
        assets.stealth_sys,
        assets.button,
        [SystemColors.stealth, Colors.text, Colors.text], // Default color for buttons
        rowWidth
    );
    vesselRow.y = helmOffset + 160;
    buttonsContainer.addChild(vesselRow);

    // --- Data Overlay (Bottom Left) ---
    const dataOverlay = new PIXI.Container();
    dataOverlay.x = 20;
    dataOverlay.y = app.screen.height - 100;
    scene.addChild(dataOverlay);

    const posText = new PIXI.Text({
        text: 'POSITION: H8\nSECTOR: 5',
        style: { fontFamily: Font.family, fontSize: 16, fill: Colors.roleSonar }
    });
    dataOverlay.addChild(posText);

    // --- Effects ---
    const noise = createNoiseOverlay(assets.noise, app);
    const scanLines = createScanlinesOverlay(assets.scanlines, app);
    scene.addChild(noise, scanLines);

    // Flicker effect on text
    const allText = []; // Collect all text objects
    game_info.children.filter(c => c instanceof PIXI.Text).forEach(c => allText.push(c));
    dataOverlay.children.filter(c => c instanceof PIXI.Text).forEach(c => allText.push(c));
    buttonsContainer.children.forEach(group => {
        if (group instanceof PIXI.Container) {
            group.children.filter(c => c instanceof PIXI.Text).forEach(c => allText.push(c));
        }
    });
    // Add helm labels
    helmContainer.children.forEach(btn => {
        btn.children.filter(c => c instanceof PIXI.Text).forEach(c => allText.push(c));
    });

    const flickerCallback = applyFlickerEffect(app, allText);
    scene.on('destroyed', () => {
        app.ticker.remove(flickerCallback);
    });

    return root;
}

function createControlRow(label, iconTexture, buttonTexture, colors, width) {
    const row = new PIXI.Container();
    const mainColor = colors[0];

    // Label
    const labelTxt = new PIXI.Text({
        text: label.toUpperCase(),
        style: { fontFamily: Font.family, fontSize: 13, fill: mainColor }
    });
    row.addChild(labelTxt);

    // Line
    const line = new PIXI.Graphics()
        .rect(0, labelTxt.height + 2, width, 1)
        .fill({ color: mainColor, alpha: 0.5 });
    row.addChild(line);

    const yOffset = labelTxt.height + 15;
    const slotWidth = width / 3;

    // Helper to create button
    const createBtn = (texture, color, slotIndex) => {
        const btn = new PIXI.Sprite(texture);
        btn.anchor.set(0.5);
        btn.scale.set(0.5);
        btn.x = slotWidth * slotIndex + slotWidth / 2;
        btn.y = yOffset + 20; // Center in the vertical space roughly
        applyTintColor(btn, color);

        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        // Simple hover effect
        btn.on('pointerover', () => { btn.alpha = 1.0; });
        btn.on('pointerout', () => { btn.alpha = 0.8; });
        btn.alpha = 0.8;

        row.addChild(btn);
        return btn;
    };

    createBtn(iconTexture, colors[0], 0);
    createBtn(buttonTexture, colors[1], 1);
    createBtn(buttonTexture, colors[2], 2);

    return row;
}
