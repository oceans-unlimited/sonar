/**
 * Creates an interactable behavior for a PixiJS target.
 * 
 * @param {import('pixi.js').Container} target - The interactive object (must have eventMode set).
 * @param {Object} callbacks - Hooks for state changes.
 * @param {function({ isHovered: boolean }): void} callbacks.onStateChange - Called when interaction state changes.
 * @param {function(): void} [callbacks.onClick] - Called on a full click/tap.
 * @returns {Object} Public API for the interaction behavior.
 */
export function createInteractable(target, { onStateChange, onClick } = {}) {
    // 1. Internal State
    const state = {
        isHovered: false,
        isPressed: false,
    };

    // 2. Input Handlers
    const onPointerOver = () => {
        if (state.isHovered) return;
        state.isHovered = true;
        notify();
    };

    const onPointerOut = () => {
        if (!state.isHovered) return;
        state.isHovered = false;
        // If we leave while pressed, we usually want to cancel the press visually
        if (state.isPressed) {
            state.isPressed = false;
        }
        notify();
    };

    const onPointerDown = () => {
        if (state.isPressed) return;
        state.isPressed = true;
        notify();
    };

    const onPointerUp = () => {
        if (!state.isPressed) return;
        state.isPressed = false;
        notify();
    };

    const onTap = (e) => {
        if (onClick) onClick(e);
    };

    // 3. State Output
    const notify = () => {
        if (onStateChange) {
            onStateChange({ ...state });
        }
    };

    // Attach Listeners
    // Ensure target is ready for events
    if (!target.eventMode || target.eventMode === 'none') {
        target.eventMode = 'static';
    }

    target.on('pointerenter', onPointerOver);
    target.on('pointerleave', onPointerOut);
    target.on('pointerdown', onPointerDown);
    target.on('pointerup', onPointerUp);
    target.on('pointerupoutside', onPointerUp);
    target.on('pointertap', onTap);

    // Return Public API (cleanup, forceUpdate, etc.)
    return {
        destroy() {
            target.off('pointerenter', onPointerOver);
            target.off('pointerleave', onPointerOut);
            target.off('pointerdown', onPointerDown);
            target.off('pointerup', onPointerUp);
            target.off('pointerupoutside', onPointerUp);
            target.off('pointertap', onTap);
        },
        getState() {
            return { ...state };
        }
    };
}