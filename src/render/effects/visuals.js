/**
 * Stateless visual manipulators. 
 * Pure property setters for "one-shot" changes.
 */
export const visuals = {
    setScale: (target, scale) => target.scale.set(scale),

    // Target background specifically so frames/tags stay opaque
    setBackgroundAlpha: (target, alpha) => {
        if (target.background) target.background.alpha = alpha;
    },

    setFrameAlpha: (target, alpha) => {
        if (target.frame) target.frame.alpha = alpha;
    },

    setTagAlpha: (target, alpha) => {
        if (target.tag) target.tag.alpha = alpha;
    },

    setOverlayAlpha: (target, alpha) => {
        if (target.overlay) target.overlay.alpha = alpha;
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

};
