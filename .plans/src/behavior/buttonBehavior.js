import { createInteractable } from './interactable';
import { createButtonEffects } from './buttonStateCoordinator';

/**
 * Wires logic to existing renderers and exposes a control API.
 * 
 * @param {import('../render/button').default} target - The existing button renderer.
 * @param {Object} interactionDef - Configuration for interaction (Four Pillars).
 * @param {function(string, Object): void} onEvent - Callback for routing events.
 * @param {import('pixi.js').Ticker} ticker - The application ticker.
 * @returns {Object} Control API
 */
export function wireButton(target, interactionDef, onEvent, ticker) {
    const { id, address, preset, event, profile = 'basic' } = interactionDef;
    
    // 1. Instantiate Effects
    const effects = createButtonEffects(target, { ticker, profile });
    
    let isEnabled = true;
    let isActive = false;
    let isInteractive = true;

    // Helper to update event mode based on composite state
    const updateInteractivity = () => {
        target.eventMode = (isEnabled && isInteractive) ? 'static' : 'none';
    };

    // Helper to send events to controller
    const emit = (meta = {}) => {
        if (!isEnabled) return;
        onEvent(event, { 
            id, 
            address, 
            isActive,
            ...meta 
        });
    };

    // 2. Instantiate Mechanical Behavior
    const interactable = createInteractable(target, {
        onStateChange: (state) => {
            // PILLAR 3: Preset Logic for Momentary
            if (preset === 'MOMENTARY' && isEnabled) {
                if (state.isPressed !== isActive) {
                    isActive = state.isPressed;
                    emit({ type: isActive ? 'START' : 'STOP' });
                }
            }

            effects.update({ ...state, isEnabled, isActive });
        },
        onClick: () => {
            if (!isEnabled) return;
    
            if (preset === 'ACTION') {
                emit();
            } else if (preset === 'TOGGLE') {
                isActive = !isActive;
                emit();
            }
        }
    });

    // 4. Public Control API
    return {
        setEnabled(enabled) {
            isEnabled = enabled;
            updateInteractivity();
            const currentState = interactable.getState();
            effects.update({ ...currentState, isEnabled, isActive });
        },
        setActive(active) {
            isActive = active;
            const currentState = interactable.getState();
            effects.update({ ...currentState, isEnabled, isActive });
        },
        setInteractive(interactive) {
            isInteractive = interactive;
            updateInteractivity();
        },
        updateButton(bgImage, bgTint, frameColor, overlayColor) {
            target.updateButton(bgImage, bgTint, frameColor, overlayColor);
            // Force effects update to pick up new tint
            const currentState = interactable.getState();
            effects.update({ ...currentState, isEnabled, isActive });
        },
        destroy() {
            interactable.destroy();
        }
    };
}