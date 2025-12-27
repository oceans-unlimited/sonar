import { interruptManager } from './InterruptManager.js';
import { InterruptTypes } from './InterruptTypes.js';

/**
 * Handles automatic resolution of interrupts based on duration or type.
 */
export class InterruptTimers {
    constructor() {
        this._durations = {
            [InterruptTypes.SONAR_PING]: 2000,
            [InterruptTypes.TORPEDO_RESOLUTION]: 5000,
            [InterruptTypes.SCENARIO_ACTION]: 3000
        };
        this._activeTimer = null;

        // Listen for new interrupts to start timers
        interruptManager.subscribe((event, interrupt) => {
            if (event === 'interruptStarted') {
                this._handleInterruptStarted(interrupt);
            } else if (event === 'interruptEnded') {
                this._clearTimer();
            }
        });
    }

    _handleInterruptStarted(interrupt) {
        const duration = this._durations[interrupt.type];
        if (duration) {
            console.log(`[InterruptTimers] Auto-resolving ${interrupt.type} in ${duration}ms`);
            this._activeTimer = setTimeout(() => {
                interruptManager.resolveInterrupt(interrupt.type);
            }, duration);
        }
    }

    _clearTimer() {
        if (this._activeTimer) {
            clearTimeout(this._activeTimer);
            this._activeTimer = null;
        }
    }
}

// Initializing singleton
export const interruptTimers = new InterruptTimers();
