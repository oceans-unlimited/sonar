import { PROFILES } from '../render/effects/interactiveProfiles';
import { INTERACTIVE_STATES } from './constants';

/**
 * Creates the visual effects coordinator for a button.
 * Maps composite state flags to profile visual functions.
 *
 * @param {import('../render/button').default} buttonView - The Button visual component
 * @param {string} profileName - Profile key from PROFILES
 * @returns {{ update: function, destroy: function, lastState: string }}
 */
export function createButtonEffects(buttonView, profileName = 'basic') {
    const profile = PROFILES[profileName] || PROFILES.basic;
    let lastState = INTERACTIVE_STATES.IDLE;
    let flickerTimer = null;

    // Apply initial state
    const idleFn = profile[INTERACTIVE_STATES.IDLE];
    if (idleFn) idleFn(buttonView);

    const update = (state) => {
        lastState = state;
        const fn = profile[state];
        if (fn) {
            fn(buttonView);
        }
    };

    /**
     * Flicker effect — rapidly toggles between two states
     * @param {string} stateA - First state
     * @param {string} stateB - Second state
     * @param {number} intervalMs - Flicker interval
     * @param {number} durationMs - Total flicker duration
     */
    const flicker = (stateA = INTERACTIVE_STATES.ACTIVE, stateB = INTERACTIVE_STATES.IDLE, intervalMs = 100, durationMs = 1000) => {
        let toggle = false;
        const startTime = Date.now();

        flickerTimer = setInterval(() => {
            toggle = !toggle;
            update(toggle ? stateA : stateB);

            if (Date.now() - startTime >= durationMs) {
                clearInterval(flickerTimer);
                flickerTimer = null;
                update(stateB); // Settle on stateB
            }
        }, intervalMs);
    };

    const destroy = () => {
        if (flickerTimer) {
            clearInterval(flickerTimer);
            flickerTimer = null;
        }
    };

    return {
        update,
        flicker,
        destroy,
        get lastState() { return lastState; }
    };
}
