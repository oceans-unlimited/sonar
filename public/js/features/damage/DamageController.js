import { socketManager } from '../../core/socketManager.js';
import { DamageEffects } from './DamageEffects.js';

/**
 * Damage Controller
 * Orchestrates damage events, animations, and state updates.
 */
export class DamageController {
    constructor(app, renderer, sceneContainer) {
        this.app = app;
        this.renderer = renderer;
        this.sceneContainer = sceneContainer; // The container to shake (usually root)

        this.lastHealth = null;
        this.effects = new DamageEffects(app, sceneContainer);

        this.init();
    }

    init() {
        this._onStateUpdate = (state) => this.handleStateUpdate(state);
        socketManager.on('stateUpdate', this._onStateUpdate);
    }

    handleStateUpdate(state) {
        console.log('[DamageController] handleStateUpdate called, health:', state.submarines[0]?.health, 'lastHealth:', this.lastHealth);
        if (!state || !state.submarines) return;

        const mySub = state.submarines.find(sub => sub.co === socketManager.playerId ||
            sub.xo === socketManager.playerId ||
            sub.eng === socketManager.playerId ||
            sub.sonar === socketManager.playerId);

        console.log('[DamageController] mySub found:', !!mySub, 'playerId:', socketManager.playerId);
        if (!mySub) return;

        // Initialize health tracking
        if (this.lastHealth === null) {
            this.lastHealth = mySub.health;
            this.renderer.update(mySub.health);
            console.log('[DamageController] Initialized lastHealth to:', this.lastHealth);
            return;
        }

        // Detect damage
        if (mySub.health < this.lastHealth) {
            console.log(`[DamageController] Damage detected! ${this.lastHealth} -> ${mySub.health}`);
            this.triggerDamageFeedback(mySub.health);
        } else if (mySub.health > this.lastHealth) {
            // Repair detected
            this.renderer.update(mySub.health);
        }

        this.lastHealth = mySub.health;
    }

    triggerDamageFeedback(newHealth) {
        console.log(`[DamageController] Triggering damage feedback for health: ${newHealth}`);
        // 1. Trigger Screen Tint
        this.effects.startScreenTint(800);

        // 2. Trigger Rumble/Shake
        this.effects.startShake(50, 800);

        // 3. Update UI
        this.renderer.update(newHealth);

        // 4. Lock Map Interaction (if applicable)
        // This will be handled via MapSystem if it exists in the current scene
        this.app.stage.emit('damage:animating', { active: true });
        setTimeout(() => {
            this.app.stage.emit('damage:animating', { active: false });
        }, 800);
    }



    destroy() {
        socketManager.off('stateUpdate', this._onStateUpdate);
        this.effects.destroy();
        this.renderer.destroy();
    }
}
