/**
 * Stateless visual manipulators. 
 * Pure property setters for "one-shot" changes.
 */
export const visuals = {
    setTint: (target, color) => {
        const bg = target.content?.getChildByLabel('btnBackground');
        if (bg) bg.tint = color;
    },

    toggleOverlay: (target, visible) => {
        const overlay = target.getChildByLabel('btnOverlay');
        if (overlay) overlay.visible = visible;
    },

    setOverlayAlpha: (target, alpha) => {
        const overlay = target.getChildByLabel('btnOverlay');
        if (overlay) overlay.alpha = alpha;
    },

    setBackgroundAlpha: (target, alpha) => {
        const bg = target.content?.getChildByLabel('btnBackground');
        if (bg) bg.alpha = alpha;
    },

    toggleTag: (target, visible) => {
        const tag = target.getChildByLabel('btnTag');
        if (tag) tag.visible = visible;
    },

    setScale: (target, scale) => {
        if (target.scale) target.scale.set(scale);
    }
};
