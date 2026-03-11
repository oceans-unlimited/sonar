import { BaseController } from '../../control/baseController.js';
import { submarine } from '../submarine/submarine.js';
import { shake, flashDamage } from '../../render/effects/damageEffects.js';
import { getStage } from '../../render/util/sceneGraph.js';

/**
 * DamageController
 * Coordinates damage logic and triggers visual feedback.
 * Listens to the submarine feature for damage events.
 */
export class DamageController extends BaseController {
    constructor() {
        super();
        this.ticker = null;
        this.ui = null;
        this._onDamage = this.handleDamageEvent.bind(this);
    }

    /**
     * Initializes the controller.
     * @param {import('pixi.js').Ticker} ticker - The application ticker.
     * @param {import('pixi.js').Container} view - The scene view container to shake.
     * @param {object} ui - The DamageUI visual component.
     */
    init(ticker, view, ui) {
        this.ticker = ticker;
        this.bindView(view);
        this.ui = ui;

        // Listen for damage events from the submarine feature
        submarine.on('submarine:damaged', this._onDamage);

        // Initial state sync if ownship is already resolved
        const ownship = submarine.getOwnship();
        if (ownship && this.ui) {
            this.ui.update(ownship.getHealth(), ownship.getProfileAsset());
        }
    }

    /**
     * Clean up listeners.
     */
    cleanup() {
        submarine.off('submarine:damaged', this._onDamage);
        this.destroy(); // BaseController cleanup
    }

    /**
     * Handles damage events from the submarine feature.
     * @param {object} data - Damage data containing id and health stats.
     */
    handleDamageEvent(data) {
        const ownship = submarine.getOwnship();
        if (!ownship || data.id !== ownship._id) return;

        console.log(`[DamageController] Damage detected for ownship: ${data.current}`);
        this.triggerDamageEffect(data, ownship.getProfileAsset());
    }

    /**
     * Triggers visual feedback for damage.
     * @param {object} healthData - Health data object.
     * @param {string} profileAsset - Submarine profile asset.
     */
    triggerDamageEffect(healthData, profileAsset) {
        if (!this.ticker || !this.view) return;

        // 1. Shake the scene view
        shake(this.view, this.ticker, 10, 800);

        // 2. Flash red tint on stage
        // Use our sceneGraph helper to find the root Stage without requiring the app object
        const stage = getStage(this.view);
        if (stage) {
            flashDamage(
                stage,
                this.ticker,
                window.innerWidth,
                window.innerHeight,
                800
            );
        }

        // 3. Update the UI visual
        if (this.ui) {
            this.ui.update(healthData, profileAsset);
        }

        // 4. Emit event for other controllers
        this.emit('damageTaken', { ...healthData, profileAsset });
    }

    // Alias for legacy support
    triggerDamageFeedback(healthData) {
        this.triggerDamageEffect(healthData);
    }
}

// Export singleton
export const damageController = new DamageController();
