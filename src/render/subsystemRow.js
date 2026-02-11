/**
 * SubsystemRow Component
 * Represents a single row in the First Officer (XO) panel.
 * Contains: Label, Line, Icon, Gauge with fills, and Status Text.
 */

import { Container, Text, Graphics, Sprite } from 'pixi.js';
import { Colors, Font } from '../core/uiStyle';
import { applyGlowEffect } from './effects/animators';
import { visuals } from './effects/visuals';

export default class SubsystemRow extends Container {
    constructor(config) {
        super();
        const { label, icon, gauge, fills, color, statusLabel = "READY" } = config;

        this.label = label;
        this.color = color;
        this.fills = [];
        this.maxLevel = fills.length;

        // 1. Header and line
        this.nameText = new Text({
            text: label.toUpperCase(),
            style: { fontFamily: Font.family, fontSize: 13, fill: color }
        });
        this.addChild(this.nameText);

        this.headerLine = new Graphics()
            .rect(0, this.nameText.y + this.nameText.height + 2, 180, 1)
            .fill({ color: color, alpha: 0.5 });
        this.addChild(this.headerLine);

        const verticalOffset = this.nameText.height + this.headerLine.height + 10;

        // 2. Icon (Primary interaction target)
        this.iconSprite = new Sprite(icon);
        this.iconSprite.scale.set(0.5);
        this.iconSprite.y = verticalOffset;
        visuals.setTint(this.iconSprite, color);
        this.addChild(this.iconSprite);

        // 3. Gauge
        this.gaugeSprite = new Sprite(gauge);
        this.gaugeSprite.scale.set(0.5);
        this.gaugeSprite.x = this.iconSprite.width + 10;
        this.gaugeSprite.y = verticalOffset;
        visuals.setTint(this.gaugeSprite, color);
        this.addChild(this.gaugeSprite);

        // 4. Fill Layer
        this.fillContainer = new Container();
        this.fillContainer.x = this.gaugeSprite.x;
        this.fillContainer.y = this.gaugeSprite.y;
        this.addChild(this.fillContainer);

        this.fillSprites = fills.map(texture => {
            const fill = new Sprite(texture);
            fill.scale.set(0.5);
            fill.visible = false;
            fill.eventMode = 'none';
            this.fillContainer.addChild(fill);
            return fill;
        });

        // 5. Status Text (Flashed when full)
        this.statusText = new Text({
            text: statusLabel.toUpperCase(),
            style: { fontFamily: Font.family, fontSize: 13, fontWeight: 'bold', fill: color }
        });
        this.statusText.x = this.gaugeSprite.x + this.gaugeSprite.width + 10;
        this.statusText.y = verticalOffset + (this.gaugeSprite.height - this.statusText.height) / 2;
        this.statusText.visible = false;
        this.statusText.eventMode = 'none';
        this.addChild(this.statusText);

        // 6. Effects
        this.fillGlow = applyGlowEffect(this.fillContainer, color);
        this.statusPulse = applyGlowEffect(this.statusText, color);
        this.fillGlow.enabled = false;
        this.statusPulse.enabled = false;
    }

    /**
     * Update the visual fill level.
     * @param {number} level 
     */
    setLevel(level) {
        this.fillSprites.forEach((sprite, index) => {
            sprite.visible = index < level;
            if (sprite.visible) visuals.setTint(sprite, this.color);
        });

        const isFull = level >= this.maxLevel;
        this.statusText.visible = isFull;
        this.fillGlow.enabled = isFull;
        this.statusPulse.enabled = isFull;
    }

    setRowColor(color) {
        this.color = color;
        this.nameText.style.fill = color;
        this.headerLine.clear().rect(0, this.nameText.y + this.nameText.height + 2, 180, 1).fill({ color: color, alpha: 0.5 });
        visuals.setTint(this.iconSprite, color);
        visuals.setTint(this.gaugeSprite, color);
        this.statusText.style.fill = color;
    }

    destroy(options) {
        this.fillGlow.destroy();
        this.statusPulse.destroy();
        super.destroy(options);
    }
}
