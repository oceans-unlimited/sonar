import { DamageController } from './DamageController.js';
import { DamageUI } from './damageRenderer.js';

/**
 * DamageManager
 * The central entry point for the Damage feature.
 * Coordinates mounting the UI, Controller, and Effects.
 */
class DamageManager {
    constructor() {
        this.controller = new DamageController();
        this.ui = null;
        this.app = null;
        this.view = null;
    }

    /**
     * Mounts the damage feature components.
     * @param {import('pixi.js').Ticker} ticker - The application ticker.
     * @param {import('pixi.js').Container} view - The scene view container for screen effects.
     * @param {import('pixi.js').Container} uiParent - The parent container for the damage UI.
     * @param {object} options - Initialization options (layout, etc).
     */
    mount(ticker, view, uiParent, options = {}) {
        this.ticker = ticker;
        this.view = view;

        // 1. Create and Mount the UI immediately with default profile
        this.ui = new DamageUI({
            ...options,
            profileAsset: options.profileAsset || 'sub_profileA'
        });
        this.ui.mount(uiParent);

        // 2. Resolve ownship profile and update asynchronously
        import('../submarine/submarine.js').then(({ submarine }) => {
            const ownSub = submarine.getOwnship();
            if (ownSub) {
                const profileAsset = ownSub.getProfileAsset();
                this.ui.updateProfile(options.profileAsset || profileAsset);
            }

            // 3. Initialize the Controller (after submarine is loaded)
            this.controller.init(this.ticker, this.view, this.ui);
        });

        console.log('[DamageManager] Mounted');
    }

    /**
     * Unmounts and cleans up the damage feature.
     */
    unmount() {
        if (this.controller) {
            this.controller.cleanup();
        }

        if (this.ui && this.ui.card) {
            this.ui.card.destroy({ children: true });
        }

        this.ui = null;
        this.ticker = null;
        this.view = null;

        console.log('[DamageManager] Unmounted');
    }
}

// Export singleton
export const damageManager = new DamageManager();
