import { PROFILES } from '../render/effects/interactiveProfiles';
import { INTERACTIVE_STATES } from './constants';

/**
 * Creates a visual effect manager for a button target.
 * 
 * @param {import('pixi.js').Container} target - The button container to animate.
 * @param {Object} options - Configuration.
 * @param {import('pixi.js').Ticker} options.ticker - The application ticker.
 * @param {string} [options.profile='basic'] - The visual profile to use.
 * @returns {Object} Public API for applying effects based on state.
 */
export function createButtonEffects(target, { ticker, profile = 'basic' } = {}) {
    
    const profileId = profile.toLowerCase();
    const visualProfile = PROFILES[profileId] || PROFILES.basic;
    let lastState = null;
    let isFlickering = false;

    const applyStateVisuals = (state) => {
        const effectFn = visualProfile[state];
        if (effectFn) {
            effectFn(target);
        }
    };

    const startFlicker = () => {
        if (isFlickering || !ticker || !target.overlay) return;
        isFlickering = true;
        
        // Set flicker-specific alpha
        target.overlay.alpha = 0.7;

        let frameCount = 0;
        const interval = 5; // 8 frames per state (~166ms)
        const totalDuration = interval * 4; // 2 flashes (On-Off-On-Off)

        const flickerTicker = () => {
            frameCount++;
            
            // Toggle visibility every 'interval' frames
            // Even steps (0, 2) are ON, Odd steps (1, 3) are OFF
            const step = Math.floor(frameCount / interval);
            target.overlay.visible = step % 2 === 0;

            if (frameCount >= totalDuration) {
                ticker.remove(flickerTicker);
                isFlickering = false;
                // Final state should be restored based on latest flags
                applyStateVisuals(lastState);
            }
        };
        ticker.add(flickerTicker);
    };

    /**
     * Updates the visual state of the button based on state flags.
     * @param {Object} state - The current state of the button.
     * @param {boolean} state.isHovered - Whether the pointer is over the button.
     * @param {boolean} [state.isPressed] - Whether the button is currently pressed.
     * @param {boolean} [state.isEnabled=true] - Whether the button is enabled.
     * @param {boolean} [state.isActive] - Whether the button is in an active/alert state.
     */
    const update = ({ isHovered, isPressed, isEnabled = true, isActive = false }) => {
        
        let currentState = INTERACTIVE_STATES.IDLE;

        if (!isEnabled) {
            currentState = INTERACTIVE_STATES.DISABLED;
        } else if (isPressed) {
            currentState = INTERACTIVE_STATES.PRESSED;
        } else if (isActive) {
            currentState = INTERACTIVE_STATES.ACTIVE;
        } else if (isHovered) {
            currentState = INTERACTIVE_STATES.HOVER;
        }

        // Detect Release for flicker (Frame profile specific requirement)
        if (profileId === 'frame' && lastState === INTERACTIVE_STATES.PRESSED && currentState !== INTERACTIVE_STATES.PRESSED) {
            startFlicker();
        }

        if (currentState !== lastState) {
            applyStateVisuals(currentState);
            lastState = currentState;
        }
    };

    return {
        update
    };
}
