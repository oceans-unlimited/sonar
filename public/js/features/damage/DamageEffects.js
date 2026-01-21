import * as PIXI from 'pixi.js';

/**
 * Damage Effects
 * Handles visual effects like screen tinting and shaking.
 */
export class DamageEffects {
    constructor(app, container) {
        this.app = app;
        this.gameContainer = container;
        this.originalX = container.x;
        this.originalY = container.y;

        this.shakeIntensity = 0;
        this.shakeTimer = 0;

        // Screen tint overlay
        this.overlay = new PIXI.Graphics();
        this.app.stage.addChild(this.overlay);
        this.overlay.visible = false;
        this.tintTimer = 0;

        // Persistent update ticker
        this.app.ticker.add(this.update.bind(this));
    }

    /**
     * Start the shake effect
     * @param {number} intensity - Pixels of displacement
     * @param {number} duration - Milliseconds
     */
    startShake(intensity, duration) {
        console.log('DamageEffects: Starting shake, intensity:', intensity, 'duration:', duration);
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    /**
     * Start the screen tint effect
     * @param {number} duration - Milliseconds
     */
    startScreenTint(duration) {
        console.log('DamageEffects: Starting screen tint, duration:', duration);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.overlay.clear()
            .rect(0, 0, w, h)
            .fill({ color: 0xff0000, alpha: 0.5 });

        this.overlay.visible = true;
        this.overlay.alpha = 1;
        this.tintTimer = duration;

        // Ensure overlay is on top z-layer
        this.app.stage.addChild(this.overlay);
    }

    /**
     * Update loop for effects
     */
    update() {
        // Handle shake
        if (this.shakeTimer > 0) {
            this.gameContainer.x = this.originalX + (Math.random() * this.shakeIntensity * 2 - this.shakeIntensity);
            this.gameContainer.y = this.originalY + (Math.random() * this.shakeIntensity * 2 - this.shakeIntensity);
            this.shakeTimer -= this.app.ticker.deltaMS;
        } else if (this.shakeTimer <= 0 && this.shakeTimer !== -1) {
            // Reset position
            this.gameContainer.x = this.originalX;
            this.gameContainer.y = this.originalY;
            this.shakeTimer = -1; // Prevent re-reset
        }

        // Handle tint fade
        if (this.tintTimer > 0) {
            this.overlay.alpha = this.tintTimer / 800; // Linear fade over 800ms
            this.tintTimer -= this.app.ticker.deltaMS;
        } else if (this.tintTimer <= 0 && this.overlay.visible) {
            this.overlay.visible = false;
            this.tintTimer = -1; // Prevent re-hide
        }
    }

    destroy() {
        this.app.ticker.remove(this.update.bind(this));
        if (this.overlay.parent) {
            this.overlay.parent.removeChild(this.overlay);
        }
        this.overlay.destroy();
    }
}