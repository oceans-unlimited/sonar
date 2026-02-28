import { INTERACTIVE_STATES } from './constants';

/**
 * Creates an interactable interface on a PixiJS display object.
 * Handles pointer events and forwards state changes to a callback.
 *
 * @param {import('pixi.js').Container} target - A PixiJS display object
 * @param {function} onStateChange - Callback with signature (state: string)
 * @returns {{ destroy: function, setEnabled: function, setInteractive: function }} Control API
 */
export function createInteractable(target, onStateChange) {
    let enabled = true;
    let currentState = INTERACTIVE_STATES.IDLE;

    const setState = (newState) => {
        if (!enabled && newState !== INTERACTIVE_STATES.DISABLED) return;
        if (currentState === newState) return;
        currentState = newState;
        onStateChange(newState);
    };

    // --- Pointer Handlers ---
    const onPointerOver = () => {
        if (!enabled) return;
        setState(INTERACTIVE_STATES.HOVER);
    };

    const onPointerOut = () => {
        if (!enabled) return;
        // Cancel any press if pointer leaves
        setState(INTERACTIVE_STATES.IDLE);
    };

    const onPointerDown = () => {
        if (!enabled) return;
        setState(INTERACTIVE_STATES.PRESSED);
    };

    const onPointerUp = () => {
        if (!enabled) return;
        // Only fire if we're in pressed state (prevents ghost clicks)
        if (currentState === INTERACTIVE_STATES.PRESSED) {
            setState(INTERACTIVE_STATES.HOVER);
        }
    };

    const onPointerUpOutside = () => {
        if (!enabled) return;
        // If pointer up happens outside, go back to idle
        if (currentState === INTERACTIVE_STATES.PRESSED) {
            setState(INTERACTIVE_STATES.IDLE);
        }
    };

    // --- Wire Up ---
    // target.eventMode = 'static';
    // target.cursor = 'pointer';
    // target.interactive = true;

    target.on('pointerover', onPointerOver);
    target.on('pointerout', onPointerOut);
    target.on('pointerdown', onPointerDown);
    target.on('pointerup', onPointerUp);
    target.on('pointerupoutside', onPointerUpOutside);

    // --- Control API ---
    const setInteractive = (isInteractive) => {
        target.eventMode = isInteractive ? 'static' : 'none';
        target.interactive = isInteractive;
        target.cursor = isInteractive ? 'pointer' : 'default';
        if (!isInteractive) setState(INTERACTIVE_STATES.IDLE);
    };

    const setEnabled = (isEnabled) => {
        enabled = isEnabled;
        target.cursor = enabled ? 'pointer' : 'default';
        if (!enabled) {
            setState(INTERACTIVE_STATES.DISABLED);
        } else {
            setState(INTERACTIVE_STATES.IDLE);
        }
    };

    const destroy = () => {
        target.off('pointerover', onPointerOver);
        target.off('pointerout', onPointerOut);
        target.off('pointerdown', onPointerDown);
        target.off('pointerup', onPointerUp);
        target.off('pointerupoutside', onPointerUpOutside);
    };

    return { destroy, setEnabled, setInteractive };
}
