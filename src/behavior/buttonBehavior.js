import { createInteractable } from './interactable';
import { createButtonEffects } from './buttonStateCoordinator';
import { INTERACTIVE_STATES } from './constants';

/**
 * Wires a visual Button component to its underlying logic and behavior.
 * Returns a control API that the controller uses to manage the button.
 *
 * @param {import('../render/button').default} buttonView - The Button visual component
 * @param {object} options
 * @param {string} options.id - Unique button identifier
 * @param {string} [options.profile='basic'] - Visual profile name
 * @param {function} [options.onPress] - Callback when button is confirmed pressed (pointerup in PRESSED)
 * @returns {object} Control API: { setEnabled, setActive, setInteractive, destroy }
 */
export function wireButton(buttonView, { id, profile = 'basic', onPress } = {}) {
    // 1. Create visual effects coordinator
    const effects = createButtonEffects(buttonView, profile);

    // 2. State flags
    let isActive = false;
    let isEnabled = true;

    // 3. Create interactable (handles pointer events)
    const interactable = createInteractable(buttonView, (state) => {
        // Handle press completion
        if (state === INTERACTIVE_STATES.HOVER && effects.lastState === INTERACTIVE_STATES.PRESSED) {
            // This is a successful press (pointerup while in pressed state)
            if (onPress && isEnabled) {
                onPress(id, buttonView);
            }
        }

        // Update visuals based on composite state
        if (!isEnabled) {
            effects.update(INTERACTIVE_STATES.DISABLED);
        } else if (isActive && state === INTERACTIVE_STATES.IDLE) {
            effects.update(INTERACTIVE_STATES.ACTIVE);
        } else {
            effects.update(state);
        }
    });

    // 4. Control API (for the controller)
    return {
        id,
        view: buttonView,

        setEnabled(flag) {
            isEnabled = flag;
            interactable.setEnabled(flag);
        },

        setActive(flag) {
            isActive = flag;
            if (isActive) {
                effects.update(INTERACTIVE_STATES.ACTIVE);
            } else {
                effects.update(INTERACTIVE_STATES.IDLE);
            }
        },

        setInteractive(flag) {
            interactable.setInteractive(flag);
        },

        destroy() {
            interactable.destroy();
            effects.destroy();
        }
    };
}
