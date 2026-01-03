import { simulationClock } from '../../core/clock/simulationClock.js';
import { gamePhaseManager, GamePhases } from '../../core/clock/gamePhaseManager.js';

/**
 * Central coordinator for interrupts.
 * Only system allowed to call simulationClock.stop() and start().
 */
export class InterruptManager {
    constructor() {
        this._activeInterrupt = null; // { type, payload }
        this._listeners = new Set();
    }

    /**
     * Requests a global interrupt.
     * @param {string} type 
     * @param {object} payload 
     */
    requestInterrupt(type, payload = {}) {
        if (this._activeInterrupt) {
            console.warn(`Interrupt already active: ${this._activeInterrupt.type}. Ignoring ${type}.`);
            return;
        }

        this._activeInterrupt = { type, payload };
        console.log(`[InterruptManager] Started: ${type}`);

        // 1. Halt simulation
        simulationClock.stop();

        // 2. Change phase to INTERRUPT
        gamePhaseManager.setPhase(GamePhases.INTERRUPT);

        // 3. Emit event
        this._emit('interruptStarted', this._activeInterrupt);
    }

    /**
     * Updates an active interrupt's payload.
     * @param {string} type 
     * @param {object} payload 
     */
    updateInterrupt(type, payload = {}) {
        if (this._activeInterrupt && this._activeInterrupt.type === type) {
            this._activeInterrupt.payload = { ...this._activeInterrupt.payload, ...payload };
            this._emit('interruptUpdated', this._activeInterrupt);
        }
    }

    /**
     * Resolves an active interrupt.
     * @param {string} type 
     */
    resolveInterrupt(type) {
        if (!this._activeInterrupt || this._activeInterrupt.type !== type) {
            console.warn(`No active interrupt of type ${type} to resolve.`);
            return;
        }

        console.log(`[InterruptManager] Resolved: ${type}`);
        this._emit('interruptResolved', this._activeInterrupt);

        // For now, resolve immediately ends the interrupt.
        // In the future, we might have a gap between resolved and ended for visuals.
        this._endInterrupt();
    }

    _endInterrupt() {
        if (!this._activeInterrupt) return;

        const endedInterrupt = this._activeInterrupt;
        this._activeInterrupt = null;

        console.log(`[InterruptManager] Ended: ${endedInterrupt.type}`);

        // 1. Resume simulation
        simulationClock.start();

        // 2. Change phase back to LIVE (if not GAME_OVER)
        if (gamePhaseManager.getPhase() !== GamePhases.GAME_OVER) {
            gamePhaseManager.setPhase(GamePhases.LIVE);
        }

        // 3. Emit event
        this._emit('interruptEnded', endedInterrupt);
    }

    /**
     * Returns the currently active interrupt or null.
     * @returns {object|null}
     */
    getActiveInterrupt() {
        return this._activeInterrupt;
    }

    /**
     * Subscribes to interrupt events.
     * @param {Function} callback 
     */
    subscribe(callback) {
        this._listeners.add(callback);
    }

    /**
     * Unsubscribes from interrupt events.
     * @param {Function} callback 
     */
    unsubscribe(callback) {
        this._listeners.delete(callback);
    }

    _emit(event, payload) {
        this._listeners.forEach(callback => callback(event, payload));
    }
}

export const interruptManager = new InterruptManager();
