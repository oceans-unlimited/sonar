import * as PIXI from "pixi.js";
import { Colors, headerFont } from "../core/uiStyle.js";
import { applyGlowEffect } from "../ui/effects/glowEffect.js";
import { applyColorBlink } from "../ui/effects/flickerEffect.js";

/**
 * Engine Renderer
 * Handles visual construction of the Engineer scene.
 * Focuses on high-fidelity direction templates and circuit overlays.
 */
export class EngineRenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;
        this.views = {
            directionTemplates: new Map(), // direction -> container
            container: null
        };
    }

    render(parent) {
        this.views.container = new PIXI.Container();
        parent.addChild(this.views.container);

        const templateWidth = 250;
        const directions = ['N', 'E', 'W', 'S'];
        const gap = 25;

        directions.forEach((direction, index) => {
            const template = this.createDirectionTemplate(direction, templateWidth);
            template.x = index * (templateWidth + gap);
            this.views.container.addChild(template);
            this.views.directionTemplates.set(direction, template);
        });

        return {
            container: this.views.container,
            directionTemplates: this.views.directionTemplates
        };
    }

    createDirectionTemplate(direction, templateWidth) {
        const container = new PIXI.Container();
        container.direction = direction;

        const tintColor = Colors.text;

        // 1. Border Frame
        const border = this.createBorder(tintColor);
        container.addChild(border);
        container.border = border;

        // 2. System Slots
        const slotsContainer = this.createSystemSlots(templateWidth, tintColor);
        container.addChild(slotsContainer);
        container.slots = slotsContainer.children;

        // 3. Label Background
        const labelSprite = PIXI.Sprite.from(this.assets.label);
        labelSprite.tint = tintColor;
        labelSprite.eventMode = 'none';
        container.addChild(labelSprite);
        container.labelSprite = labelSprite;

        // 4. Direction Label
        const label = new PIXI.Text(direction, {
            fontFamily: headerFont.family,
            fontSize: headerFont.size,
            fontWeight: 'bold',
            fill: 0x000000,
            align: 'center'
        });
        label.anchor.set(0.5);
        label.x = 32;
        label.y = 25;
        container.addChild(label);
        container.directionLabel = label;

        // 5. Blinker & Glow
        const blinker = applyColorBlink(
            [labelSprite, border.cornersSprite],
            this.app,
            Colors.text,
            Colors.active,
            2,
            false
        );
        container.blinker = blinker;

        const borderGlow = applyGlowEffect(border.borderSprite, this.app, Colors.text);
        borderGlow.off();
        container.borderGlow = borderGlow;

        // View API
        container.updateDirectionState = (isActive) => {
            const elements = [labelSprite, border.cornersSprite, border.borderSprite];
            if (isActive) {
                blinker.blink();
                borderGlow.steadyOn();
                border.borderSprite.tint = Colors.text;
                elements.forEach(el => el.alpha = 1);
            } else {
                borderGlow.off();
                elements.forEach(el => {
                    el.tint = Colors.dim;
                    el.alpha = 0.5;
                });
            }
        };

        return container;
    }

    createBorder(tintColor) {
        const container = new PIXI.Container();

        const cornersSprite = PIXI.Sprite.from(this.assets.corners);
        cornersSprite.tint = tintColor;
        cornersSprite.eventMode = 'none';
        container.addChild(cornersSprite);
        container.cornersSprite = cornersSprite;

        const borderSprite = PIXI.Sprite.from(this.assets.border);
        borderSprite.anchor.set(0.5);
        borderSprite.x = cornersSprite.width / 2;
        borderSprite.y = cornersSprite.height / 2;
        borderSprite.tint = tintColor;
        borderSprite.eventMode = 'none';
        container.addChild(borderSprite);
        container.borderSprite = borderSprite;

        return container;
    }

    createSystemSlots(templateWidth, tintColor) {
        const container = new PIXI.Container();

        const frameSlotPositions = [
            { x: templateWidth / 2, y: 80, id: 'slot01' },
            { x: templateWidth / 2, y: 180, id: 'slot02' },
            { x: templateWidth / 2, y: 280, id: 'slot03' }
        ];

        const reactorSlotPositions = [
            { x: (templateWidth / 4) - 15, y: 400, id: 'reactor01' },
            { x: (templateWidth / 2), y: 400, id: 'reactor02' },
            { x: (templateWidth * 3 / 4) + 15, y: 400, id: 'reactor03' }
        ];

        frameSlotPositions.forEach(pos => {
            const slot = this.createSlot(pos.x, pos.y, pos.id, tintColor, 'frame');
            container.addChild(slot);
        });

        reactorSlotPositions.forEach(pos => {
            const slot = this.createSlot(pos.x, pos.y, pos.id, tintColor, 'reactor');
            container.addChild(slot);
        });

        return container;
    }

    createSlot(x, y, id, tintColor, type) {
        const slot = new PIXI.Container();
        slot.x = x;
        slot.y = y;
        slot.slotId = id;
        slot.type = type;

        if (type === 'frame') {
            const baseSprite = PIXI.Sprite.from(this.assets.circuitColor);
            baseSprite.anchor.set(0.5);
            baseSprite.tint = tintColor;
            baseSprite.eventMode = 'none';
            slot.addChild(baseSprite);

            const circuitOverlay = PIXI.Sprite.from(this.assets.circuitColor);
            circuitOverlay.anchor.set(0.5);
            circuitOverlay.visible = false;
            circuitOverlay.eventMode = 'none';
            slot.addChild(circuitOverlay);
            slot.circuitOverlay = circuitOverlay;
        }

        return slot;
    }

    renderSystemButton(system) {
        const button = new PIXI.Sprite(this.assets[system]);
        button.anchor.set(0.5);
        button.eventMode = 'static';
        button.system = system;
        return button;
    }
}
