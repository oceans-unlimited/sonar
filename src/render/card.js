import { LayoutContainer } from '@pixi/layout/components';
import { cardPatterns } from './layouts';
import { cascadeColor } from './util/colorOps';

/**
 * Card is a flexible LayoutContainer for grouping related UI elements.
 * Extends LayoutContainer to handle auto-layout of children.
 */
export default class Card extends LayoutContainer {
    constructor(pattern, config = {}) {
        super();

        const {
            label,
            backgroundColor = 0xFFFFFF,
            borderColor = 0xFFFFFF,
            borderWidth = 3,
            borderRadius = 8,
            padding = 10
        } = config;

        this.label = label;

        // Configure layout behavior
        this.layout = {
            ...(cardPatterns[pattern] || cardPatterns.generic),
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius,
            padding
        };

        // Cards are non-interactive by default, but allow children to be
        this.interactive = false;
        this.interactiveChildren = true;
    }

    /**
     * Updates the background color (cascades where appropriate).
     * Follows COLOR_CONTROL_PLAN.md.
     */
    setTint(color) {
        this.layout = { backgroundColor: color };
        // Cascade to specific children if needed (e.g., icons or specific labels)
        cascadeColor(this, color);
    }

    /**
     * Updates the border color.
     */
    setBorderColor(color) {
        this.layout = { borderColor: color };
    }

    /**
     * Set the background alpha.
     */
    setAlpha(alpha) {
        if (this.background) {
            this.background.alpha = alpha;
        }
    }
}
