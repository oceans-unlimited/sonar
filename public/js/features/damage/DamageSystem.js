import * as PIXI from 'pixi.js';
import { DamageRenderer } from './DamageRenderer.js';
import { DamageController } from './DamageController.js';

/**
 * Damage System Facade
 * Provides a simple API for scenes to mount and interact with the Damage feature.
 */
export class DamageSystem {
    constructor(app, assets, config = {}) {
        this.app = app;
        this.assets = assets;
        this.config = config;
        this.renderer = null;
        this.controller = null;
    }

    /**
     * Mounts the damage system to the scene's UI elements
     * @param {PIXI.Container} parent - Parent container for damage UI elements
     * @param {PIXI.Sprite} subProfile - Submarine profile sprite to tint
     * @param {PIXI.Text} subLabel - Submarine label text to color
     * @param {PIXI.Container} sceneContainer - Root container for shake effects
     */
    mount(parent, subProfile, subLabel, sceneContainer) {
        this.renderer = new DamageRenderer(this.app, this.assets);
        this.renderer.mount(parent, subProfile, subLabel, sceneContainer);
        this.renderer.updateLayout(300); // Default layout width

        this.controller = new DamageController(this.app, this.renderer, sceneContainer);

        // Initialize health state (can be overridden via config)
        const initialHealth = this.config.initialHealth || 4;
        this.controller.lastHealth = initialHealth;
        this.renderer.update(initialHealth);
    }

    /**
     * Triggers damage feedback effects (screen tint + shake)
     * @param {number} health - Current health level
     */
    triggerDamage(health) {
        if (this.controller) {
            this.controller.triggerDamageFeedback(health);
        }
    }

    /**
     * Updates the visual state to a specific health level
     * @param {number} health - Health level to display
     */
    updateHealth(health) {
        if (this.renderer) {
            this.renderer.update(health);
        }
    }

    /**
     * Handles state updates (for testing or direct integration)
     * @param {object} state - Game state object
     */
    handleStateUpdate(state) {
        if (this.controller) {
            this.controller.handleStateUpdate(state);
        }
    }

    /**
     * Shows the damage UI elements
     */
    show() {
        // Damage elements are always visible as they tint existing UI
        // Could implement visibility toggles for gauge if needed
    }

    /**
     * Hides the damage UI elements
     */
    hide() {
        // Similar to show - damage overlays existing UI
    }

    /**
     * Updates layout dimensions
     * @param {number} width - New layout width
     */
    updateLayout(width) {
        if (this.renderer) {
            this.renderer.updateLayout(width);
        }
    }

    /**
     * Destroys the damage system and cleans up resources
     */
    destroy() {
        if (this.controller) this.controller.destroy();
        if (this.renderer) this.renderer.destroy();
        this.renderer = null;
        this.controller = null;
    }
}