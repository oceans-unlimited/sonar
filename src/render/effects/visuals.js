/**
 * Stateless visual manipulators. 
 * Pure property setters for "one-shot" changes.
 */
export const visuals = {
    setTint: (target, color) => {
        const bg = target.content?.getChildByLabel('btnBackground');
        if (bg) {
            bg.tint = color;
            console.log(`[Visuals] Set tint on ${target.label || 'button'}: ${color.toString(16)}`);
        }
    },

    toggleOverlay: (target, visible) => {
        const overlay = target.getChildByLabel('btnOverlay');
        if (overlay) {
            overlay.visible = visible;
            console.log(`[Visuals] Toggle overlay on ${target.label || 'button'}: ${visible}`);
        }
    },

    setOverlayAlpha: (target, alpha) => {
        const overlay = target.getChildByLabel('btnOverlay');
        if (overlay) {
            overlay.alpha = alpha;
            console.log(`[Visuals] Set overlay alpha on ${target.label || 'button'}: ${alpha}`);
        }
    },

    setBackgroundAlpha: (target, alpha) => {
        const bg = target.content?.getChildByLabel('btnBackground');
        if (bg) {
            bg.alpha = alpha;
            console.log(`[Visuals] Set background alpha on ${target.label || 'button'}: ${alpha}`);
        } else {
            console.warn(`[Visuals] btnBackground not found on ${target.label || 'button'}`);
        }
    },

    toggleTag: (target, visible) => {
        const tag = target.getChildByLabel('btnTag');
        if (tag) tag.visible = visible;
    },

    setScale: (target, scale) => {
        if (target.scale) target.scale.set(scale);
    }
};
