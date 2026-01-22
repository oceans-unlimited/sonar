import * as PIXI from 'pixi.js';
import { Colors, Font, headerFont, SystemColors } from '../../core/uiStyle.js';
import { applyTintColor, applyGlowEffect } from '../../ui/effects/glowEffect.js';

/**
 * Damage Renderer
 * Handles the visual representation of hull damage and screen-wide effects.
 */
export class DamageRenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;

        // Overlay for full-screen red tint
        this.damageOverlay = new PIXI.Graphics();
        this.damageOverlay.visible = false;
        this.damageOverlay.eventMode = 'none';

        // UI references
        this.ui = {
            subProfile: null,
            subLabel: null,
            healthLabel: null,
            gaugeGroup: null,
            gaugeFills: [],
            glow: null,
            root: null
        };
    }

    /**
     * Mounts the damage UI elements to a parent container (usually the header)
     * and the overlay to a root container.
     */
    mount(parent, subProfile, subLabel, root) {
        this.ui.subProfile = subProfile;
        this.ui.subLabel = subLabel;
        this.ui.root = this.app.stage;

        // Attach overlay to root
        this.ui.root.addChild(this.damageOverlay);

        // Create health percentage label
        this.ui.healthLabel = new PIXI.Text({
            text: '100%',
            style: {
                fontFamily: Font.family,
                fontSize: 10,
                fill: Colors.text,
                fontWeight: 'bold'
            }
        });
        this.ui.healthLabel.anchor.set(1, 0);
        this.ui.healthLabel.y = subLabel.y;
        // Position will be updated in updateLayout
        parent.addChild(this.ui.healthLabel);

        // Create landscape gauge group
        this.ui.gaugeGroup = new PIXI.Container();
        this.ui.gaugeGroup.visible = false;
        this.ui.gaugeGroup.y = subLabel.y + 15;
        this.ui.gaugeGroup.x = subProfile.x;
        parent.addChild(this.ui.gaugeGroup);

        // 1. Create Fills (1 to 4)
        // Assuming fill1 is bottom/start, fill4 is top/end.
        // Or 1, 2, 3, 4 represent the segments.
        // We'll add them all, then frame on top.
        this.ui.gaugeFills = [];
        for (let i = 1; i <= 4; i++) {
            const fillName = `four_gauge_fill${i}`;
            const fill = new PIXI.Sprite(this.assets[fillName]);
            fill.scale.set(0.4);
            fill.rotation = -Math.PI / 2;
            fill.anchor.set(1, 0);
            this.ui.gaugeGroup.addChild(fill);
            this.ui.gaugeFills.push(fill);
        }

        // 2. Create Frame
        const gaugeFrame = new PIXI.Sprite(this.assets['four_gauge']);
        gaugeFrame.scale.set(0.4);
        gaugeFrame.rotation = -Math.PI / 2;
        gaugeFrame.anchor.set(1, 0);
        this.ui.gaugeGroup.addChild(gaugeFrame);

        // Descriptor Text
        const descriptor = new PIXI.Text({
            text: 'FULL',
            style: {
                fontFamily: headerFont.family,
                fontSize: 10,
                fill: Colors.text,
                fontWeight: 'bold'
            }
        });
        descriptor.x = 45;
        descriptor.y = 5;

        this.ui.gaugeGroup.addChild(descriptor);
        this.ui.gaugeSprite = gaugeFrame;
        this.ui.descriptor = descriptor;

        // Setup interactions
        subProfile.eventMode = 'static';
        subProfile.cursor = 'pointer';

        const showGauge = () => { this.ui.gaugeGroup.visible = true; };
        const hideGauge = () => { this.ui.gaugeGroup.visible = false; };

        subProfile.on('pointerover', showGauge);
        subProfile.on('pointerout', hideGauge);
        subProfile.on('pointertap', () => {
            this.ui.gaugeGroup.visible = !this.ui.gaugeGroup.visible;
        });
    }

    update(health, totalHealth = 4) {
        if (!this.ui.subProfile) return;

        const percent = Math.round((health / totalHealth) * 100);
        this.ui.healthLabel.text = `${percent}%`;

        // Determine color and descriptor based on health level
        let color;
        let descriptor;

        if (health >= 4) {
            color = Colors.text; // green
            descriptor = 'FULL';
        } else if (health >= 3) {
            color = 0xffff00; // yellow
            descriptor = 'NOMINAL';
        } else if (health >= 2) {
            color = Colors.caution; // orange
            descriptor = 'DAMAGED';
        } else {
            color = Colors.danger; // red
            descriptor = 'HULL CRITICAL';
        }

        // Tint logic
        applyTintColor(this.ui.subProfile, color);
        applyTintColor(this.ui.gaugeSprite, color);

        // Update Fills: Show up to 'health' fills
        // If max health is 4, and current is 3: show fill1, fill2, fill3.
        const healthInt = Math.ceil(health);
        this.ui.gaugeFills.forEach((fill, index) => {
            // index 0 is fill1
            if (index < healthInt) {
                fill.visible = true;
                applyTintColor(fill, color);
            } else {
                fill.visible = false;
            }
        });

        this.ui.healthLabel.style.fill = color;
        this.ui.descriptor.text = descriptor;
        this.ui.descriptor.style.fill = color;

        // Pulse effect for Critical (health 1 or less)
        if (health <= 1) {
            if (!this.ui.glow) {
                this.ui.glow = applyGlowEffect(this.ui.subProfile, this.app, color);
                this.ui.glow.pulse();
            }
        } else if (this.ui.glow) {
            this.ui.glow.off();
            this.ui.glow = null;
        }
    }

    updateLayout(parentWidth) {
        if (this.ui.healthLabel) {
            this.ui.healthLabel.x = parentWidth - 10;
        }
    }

    /**
     * Triggers screen-wide red tint
     */
    triggerScreenTint(duration = 500) {
        console.log('DamageRenderer: Triggering screen tint, duration:', duration);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.damageOverlay.clear()
            .rect(0, 0, w, h)
            .fill({ color: Colors.danger, alpha: 0.1 });

        console.log('DamageRenderer: Overlay cleared and filled, w:', w, 'h:', h, 'alpha:', 0.3);
        this.damageOverlay.visible = true;
        this.damageOverlay.alpha = 1;
        console.log('DamageRenderer: Overlay set visible, alpha: 1');

        let elapsed = 0;
        const fade = (deltaMS) => {
            elapsed += deltaMS;
            console.log('DamageRenderer: Fading, elapsed:', elapsed, 'alpha:', this.damageOverlay.alpha);
            if (elapsed >= duration) {
                this.damageOverlay.visible = false;
                console.log('DamageRenderer: Tint complete, set invisible');
                this.app.ticker.remove(fade);
            }
        };
        this.app.ticker.add(fade);
        console.log('DamageRenderer: Fade ticker added');
    }

    destroy() {
        if (this.damageOverlay) {
            if (this.damageOverlay.parent) {
                this.damageOverlay.parent.removeChild(this.damageOverlay);
            }
            this.damageOverlay.destroy();
        }
        if (this.ui.glow) this.ui.glow.off();
        if (this.ui.gaugeGroup) this.ui.gaugeGroup.destroy({ children: true });
        if (this.ui.healthLabel) this.ui.healthLabel.destroy();
        // Note: subProfile and subLabel are managed by the parent scene and should not be destroyed here
    }
}
