import { BaseController } from '../../control/baseController';

/**
 * DamageController
 * Feature controller for handling hull damage events and visual feedback.
 */
export class DamageController extends BaseController {
    constructor() {
        super();
        this.handlers = {
            ...this.handlers,
            /**
             * TRIGGER: UI button for testing damage visuals.
             */
            'SIMULATE_DAMAGE': (d) => this.handleSimulateDamage(d)
        };
    }

    onSocketBound() {
        // Listen for specific damage events from the server
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.on('ENGINE_DAMAGE', (data) => this.handleDamage(data));
        }
    }

    onSocketUnbound() {
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.off('ENGINE_DAMAGE');
        }
    }

    /**
     * Primary handler for incoming damage data.
     * @param {object} data - { severity, row, col, subId }
     */
    handleDamage(data) {
        console.warn(`[DamageController] Hull integrity compromised:`, data);
        // HOOK: Trigger screen shake, red flash, or other global effects here.
        if (this.view && this.view.playDamageEffect) {
            this.view.playDamageEffect(data.severity);
        }
    }

    /**
     * Testing hook to trigger effects without server broadcast.
     */
    handleSimulateDamage(data) {
        const severity = data?.severity || 'moderate';
        this.handleDamage({ severity });
    }
}
