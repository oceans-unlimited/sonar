import * as PIXI from "pixi.js";
import { Colors, Font, headerFont, SystemColors, CircuitColors } from "../core/uiStyle.js";
import { renderControlPanel } from "./panelRenderer.js";
import { applyGlowEffect } from "../ui/effects/glowEffect.js";
import { applyColorBlink } from "../ui/effects/flickerEffect.js";
import { DamageRenderer } from "../features/damage/DamageRenderer.js";
import { DamageController } from "../features/damage/DamageController.js";
import { MessagesRenderer } from "../features/messages/MessagesRenderer.js";

/**
 * Engine Renderer
 * Handles visual construction of the Engineer scene.
 * Features a dual-pane layout (Main Window + Control Panel).
 */
export class EngineRenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;
        this.views = {
            directionTemplates: new Map(), // direction -> container
            circuitButtons: new Map(), // "direction_slotId" -> container
            reactorSlots: new Map(), // "direction_slotId" -> container
            controlsPanel: null,
            root: null
        };
    }

    render(parent) {
        this.scene = parent;
        const root = new PIXI.Container();
        this.views.root = root;
        parent.addChild(root);

        const IS_MOBILE = this.app.screen.width < 800;
        const CONTROLS_WIDTH = IS_MOBILE ? 270 : 300;
        const MAIN_WIDTH = this.app.screen.width - CONTROLS_WIDTH;

        // 1. Controls Panel (Right)
        this.views.controlsPanel = renderControlPanel(this.app, this.assets, {
            name: "Engine Control",
            width: CONTROLS_WIDTH,
            height: this.app.screen.height,
            showOverlays: true
        });
        this.views.controlsPanel.x = MAIN_WIDTH;
        root.addChild(this.views.controlsPanel);

        // 2. Control Panel Header (Damage + Player)
        this.renderControlHeader(this.views.controlsPanel, CONTROLS_WIDTH);

        // 3. Message System (Bottom of Control Panel)
        this.renderMessageDock(this.views.controlsPanel, CONTROLS_WIDTH);

        // 4. Main Window (Left) - Stacked Direction Rows
        const mainArea = new PIXI.Container();
        root.addChild(mainArea);
        this.renderMainArea(mainArea, MAIN_WIDTH);

        // 5. Setup Listeners
        this.setupSceneListeners(MAIN_WIDTH);

        return {
            root,
            directionTemplates: this.views.directionTemplates,
            circuitButtons: this.views.circuitButtons,
            reactorSlots: this.views.reactorSlots
        };
    }

    setupSceneListeners(mainWidth) {
        if (!this.scene) return;

        this.scene.on('update_engine_view', (data) => {
            const { pushedButtons, movingDirection, engineLayout } = data;

            // 1. Update Direction Templates
            this.views.directionTemplates.forEach((template, dir) => {
                template.updateDirectionState(dir === movingDirection);

                // Update icons/colors based on current layout
                if (engineLayout && engineLayout.directions && engineLayout.directions[dir]) {
                    const dirLayout = engineLayout.directions[dir];

                    // Circuits
                    ['slot01', 'slot02', 'slot03'].forEach(slotId => {
                        const btn = this.views.circuitButtons.get(`${dir}_${slotId}`);
                        if (btn) {
                            const systemName = dirLayout.frameSlots[slotId]?.system || dirLayout.frameSlots[slotId];
                            if (systemName) this.updateButtonDetails(btn, systemName);

                            // Offline state
                            const isOffline = dirLayout.frameSlots[slotId]?.isOffline || false;
                            btn.offlineTag.visible = isOffline;
                        }
                    });

                    // Reactors
                    ['reactor01', 'reactor02', 'reactor03'].forEach(slotId => {
                        const slot = this.views.reactorSlots.get(`${dir}_${slotId}`);
                        if (slot) {
                            const isDisabled = dirLayout.reactorSlots[slotId]?.isDisabled || false;
                            slot.disabledTag.visible = isDisabled;
                        }
                    });
                }
            });

            // 5. Update Pushed (Crossed Out) State
            this.views.circuitButtons.forEach((btn, key) => {
                const isPushed = pushedButtons.has(key);
                btn.alpha = isPushed ? 0.3 : 1.0;
                btn.cursor = isPushed ? 'default' : 'pointer';
                if (isPushed) btn.offlineTag.visible = true;
            });

            // 6. Update Damage
            if (data.hullDamage !== undefined) {
                this.damageRenderer.updateDamage(data.hullDamage);
            }
        });

        // Wire up interaction events
        this.views.circuitButtons.forEach((btn, key) => {
            const [direction, slotId] = key.split('_');
            btn.on('pointerdown', () => {
                this.scene.emit('engineer_circuit_press', { direction, slotId });
            });
        });
    }

    updateButtonDetails(btn, systemName) {
        // Find icon entry
        const iconSprite = btn.children.find(c => c instanceof PIXI.Sprite && c !== btn.offlineTag && c.tint !== undefined && c.anchor);
        if (iconSprite) {
            const textureKey = systemName === 'vessel' ? 'vessel' : systemName;
            if (this.assets[textureKey]) {
                iconSprite.texture = this.assets[textureKey];
            }
            iconSprite.tint = SystemColors[systemName] || 0xffffff;
        }
    }

    renderControlHeader(parent, width) {
        const header = new PIXI.Container();
        header.x = 0;
        header.y = 10;
        parent.addChild(header);

        // Sub Profile & Damage
        const subProfile = new PIXI.Sprite(this.assets.sub_profileA);
        subProfile.scale.set(0.6);
        subProfile.x = 10;
        header.addChild(subProfile);
        this.views.subProfile = subProfile;

        const subLabel = new PIXI.Text({
            text: 'SYSTEMS STATUS',
            style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
        });
        subLabel.x = 10;
        subLabel.y = 37;
        header.addChild(subLabel);
        this.views.subLabel = subLabel;

        // Damage System Integration
        this.damageRenderer = new DamageRenderer(this.app, this.assets);
        this.damageRenderer.mount(parent, subProfile, subLabel, this.views.root);
        this.damageRenderer.updateLayout(width);

        this.damageController = new DamageController(this.app, this.damageRenderer, this.views.root);

        // Player Info
        const engBadge = new PIXI.Sprite(this.assets.role_engineer);
        engBadge.anchor.set(1, 0);
        engBadge.scale.set(0.4);
        engBadge.x = width - 10;
        header.addChild(engBadge);

        const roleLabel = new PIXI.Text({
            text: 'CHIEF ENGINEER',
            style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
        });
        roleLabel.anchor.set(1, 0);
        roleLabel.x = width - 10;
        roleLabel.y = 37;
        header.addChild(roleLabel);
    }

    renderMessageDock(parent, width) {
        const dockHeight = 150;
        const messagesRenderer = new MessagesRenderer(this.app, this.assets, {
            layout: 'docked',
            width: width - 20,
            height: dockHeight,
            x: 10,
            y: this.app.screen.height - dockHeight - 10
        });
        parent.addChild(messagesRenderer.container);
        this.views.messagesRenderer = messagesRenderer;
    }

    renderMainArea(parent, width) {
        const directions = ['N', 'E', 'W', 'S'];

        // Calculate scale factor relative to the available MAIN_WIDTH
        // Base width = Frame (width) + Gap (20) + 3 Circuits (width) + 2 Gaps (15)
        const baseFrameWidth = this.assets.directionFrame.width;
        const baseCircuitWidth = this.assets.circuit_frame.width;
        const totalBaseWidth = baseFrameWidth + 20 + (3 * baseCircuitWidth) + 30; // 30 = 2 * 15 gap

        const targetWidth = width * 0.9;
        const scale = targetWidth / totalBaseWidth;

        // Vertical layout adjustments
        const topMargin = 60; // Buffer for alert text
        const bottomPadding = 40;
        const availableHeight = this.app.screen.height - topMargin - bottomPadding;
        const rowHeight = availableHeight / 4;

        directions.forEach((dir, i) => {
            const row = this.createDirectionRow(dir, width, scale);
            row.y = topMargin + (i * rowHeight);
            row.x = (width - (totalBaseWidth * scale)) / 2;
            parent.addChild(row);
            this.views.directionTemplates.set(dir, row);
        });
    }

    createDirectionRow(direction, totalWidth, scale) {
        const container = new PIXI.Container();
        container.scale.set(scale);

        // 1. Direction Frame (Base)
        const frame = new PIXI.Sprite(this.assets.directionFrame);
        container.addChild(frame);
        container.frame = frame;

        // 2. Direction Label
        const label = new PIXI.Text({
            text: direction,
            style: { fontFamily: headerFont.family, fontSize: 32, fill: 0x000000, fontWeight: 'bold' }
        });
        label.anchor.set(0.5);
        label.x = 42;
        label.y = 30;
        container.addChild(label);

        // 3. Reactor Slots (Under Frame)
        const reactorArea = new PIXI.Container();
        reactorArea.y = frame.height + 5;
        container.addChild(reactorArea);

        const grid = new PIXI.Sprite(this.assets.reactorGrid);
        reactorArea.addChild(grid);

        // Define reactor hitboxes/slots (3 per direction)
        for (let i = 1; i <= 3; i++) {
            const slot = new PIXI.Container();
            slot.x = (grid.width / 3) * (i - 1) + (grid.width / 6);
            slot.y = grid.height / 2;

            const tag = new PIXI.Sprite(this.assets.reactor_tag);
            tag.anchor.set(0.5);
            tag.visible = false;
            slot.addChild(tag);
            slot.disabledTag = tag;

            reactorArea.addChild(slot);
            // Match reactor01, reactor02, reactor03 for source cross-reference
            this.views.reactorSlots.set(`${direction}_reactor0${i}`, slot);
        }

        // 4. Circuit Buttons (To the right)
        const circuitArea = new PIXI.Container();
        circuitArea.x = frame.width + 20;
        container.addChild(circuitArea);

        const systems = [
            { id: 'slot01', icon: 'weapons', color: CircuitColors.A, sysColor: SystemColors.weapons, label: 'A' },
            { id: 'slot02', icon: 'detection', color: CircuitColors.B, sysColor: SystemColors.detection, label: 'B' },
            { id: 'slot03', icon: 'stealth', color: CircuitColors.C, sysColor: SystemColors.stealth, label: 'C' }
        ];

        systems.forEach((sys, i) => {
            const btn = new PIXI.Container();
            btn.x = i * (this.assets.circuit_frame.width + 15);

            const frameSprite = new PIXI.Sprite(this.assets.circuit_frame);
            frameSprite.tint = sys.color;
            btn.addChild(frameSprite);

            const icon = new PIXI.Sprite(this.assets[sys.icon]);
            icon.anchor.set(0.5);
            icon.scale.set(0.4);
            icon.x = frameSprite.width / 2;
            icon.y = frameSprite.height / 2;
            icon.tint = sys.sysColor;
            btn.addChild(icon);

            const cornerLabel = new PIXI.Text({
                text: sys.label,
                style: { fontFamily: Font.family, fontSize: 10, fill: sys.color }
            });
            cornerLabel.x = 5;
            cornerLabel.y = 5;
            btn.addChild(cornerLabel);

            const gridTag = new PIXI.Sprite(this.assets.grid_tag);
            gridTag.visible = false;
            btn.addChild(gridTag);
            btn.offlineTag = gridTag;

            btn.eventMode = 'static';
            btn.cursor = 'pointer';

            circuitArea.addChild(btn);
            this.views.circuitButtons.set(`${direction}_${sys.id}`, btn);
        });

        // Update API
        container.updateDirectionState = (isActive) => {
            frame.tint = isActive ? Colors.text : Colors.dim;
            frame.alpha = isActive ? 1 : 0.6;
        };

        return container;
    }
}
