import { LayoutContainer } from '@pixi/layout/components';
import { panelPatterns } from './layouts';

/**
 * Panel is a LayoutContainer that knows how to configure its own 'layout' property
 * and hold button blocks or other features and display objects. 
 */

export default class Panel extends LayoutContainer {
    constructor(pattern, config = {}) {
        super();

        const {
            label,          // Selector ID (canonical)
            backgroundColor = 0xFFFFFF,
            borderColor = 0xFFFFFF,
            borderWidth = 4,
            borderRadius = 12
        } = config;

        this.label = label;

        this.layout = {
            ...(panelPatterns[pattern] || panelPatterns.generic),
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius
        };
        this.interactive = false;
    }

    /**
     * Updates the background color of the panel.
     * @param {number} color - Hex color value
     */
    setTint(color) {
        this.layout = { backgroundColor: color };
    }

    /**
     * Updates the border color of the panel.
     * @param {number} color - Hex color value
     */
    setBorderColor(color) {
        this.layout = { borderColor: color };
    }
}