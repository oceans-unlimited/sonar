/**
 * Stateless visual manipulators. 
 * Pure property setters for "one-shot" changes.
 */
export const visuals = {
    setScale: (target, scale) => target.scale.set(scale),

    // Target background specifically so frames/tags stay opaque
    setAlpha: (target, alpha) => {
        if (target.background) target.background.alpha = alpha;
    },

    // Structural (assuming target has these properties)
    toggleOverlay: (target, visible) => {
        if (target.overlay) target.overlay.visible = visible
    },
    toggleTag: (target, visible) => {
        if (target.tag) target.tag.visible = visible
    },

    setTint: (target, color) => {
        if (target.background) target.background.tint = color
    },

    setOverlayAlpha: (target, alpha) => {
        if (target.overlay) target.overlay.alpha = alpha;
    }
};
