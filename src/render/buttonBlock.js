import { Container, Text, Graphics } from 'pixi.js';
import { LayoutContainer } from '@pixi/layout/components';
import { buttonBlockPatterns } from './layouts';
import { Fonts } from '../core/uiStyle';
import { cascadeColor } from './util/colorOps.js';

/**
 * ButtonBlock is just a Container that knows how to configure its own 'layout' property
 * and hold buttons. It supports an optional header with label and line.
 */
export default class ButtonBlock extends Container {
    constructor(buttons = [], layoutPattern = 'horizontal', config = {}) {
        super();

        const {
            label,          // Selector ID (canonical)
            heading,        // Visible text content
            color = 0xFFFFFF,
            header = false,
            line = false
        } = config;

        this.buttons = buttons;
        this.label = label; // PixiJS Selector Property

        // 1. Container Layout Config
        const chosenPattern = buttonBlockPatterns[layoutPattern];

        this.layout = {
            width: '100%',
            flexDirection: 'column',
            gap: 8
        };

        // 2. Render Header (Optional)
        if (header && heading) {
            this.createHeader(heading, color, line);
        }

        // 3. Render Button Content
        this.createContentRow(chosenPattern);
    }

    createHeader(headingText, color, showLine) {
        this.headerContainer = new Container({
            label: 'headerContainer'
        });
        this.headerContainer.layout = {
            width: '100%',
            height: 'auto',
            flexDirection: 'column',
            marginBottom: 5
        };

        // Heading
        // Per COLOR_CONTROL_PLAN, we use white fill and apply initial color via tint
        const text = new Text({
            text: headingText.toUpperCase(),
            style: {
                fontFamily: Fonts.primary, // Using standard app font via uiStyle.js
                fontSize: 16, // Increased size
                fill: 0xFFFFFF,
                letterSpacing: 2
            }
        });
        text.label = 'blockLabel'; // Selector
        text.tint = color;

        // Removed 'intrinsic' strict sizing if it was causing collapse. 
        // In Yoga/PixiLayout, text usually auto-sizes without explicit 'intrinsic' unless container constraints force it down.
        // We add a minimal margin.
        text.layout = {
            marginLeft: 5,
            marginTop: 5
        };
        this.headerContainer.addChild(text);

        // Separator Line
        if (showLine) {
            // Per COLOR_CONTROL_PLAN, we use white fill and apply initial color via tint
            const graphics = new Graphics()
                .rect(0, 0, 100, 4) // Initial size, layout will stretch
                .fill({ color: 0xFFFFFF, alpha: 0.5 });

            graphics.label = 'headerLine'; // Selector
            graphics.tint = color;

            graphics.layout = {
                width: '100%',
                height: 2,
                marginTop: 2
            };
            this.headerContainer.addChild(graphics);
        }

        this.addChild(this.headerContainer);
    }

    createContentRow(pattern) {
        this.buttonRow = new LayoutContainer();
        this.buttonRow.label = 'buttonRow';

        // Inherit the requested pattern (horizontal/vertical) for the buttons themselves
        this.buttonRow.layout = {
            ...pattern,
        };

        this.buttons.forEach(btn => this.buttonRow.addChild(btn));
        this.addChild(this.buttonRow);
    }

    /**
     * Appends a child to the content (buttonRow).
     * @param {import('pixi.js').DisplayObject} child 
     */
    addContent(child) {
        if (!child || child.parent === this.buttonRow) return;
        this.buttonRow.addChild(child);
    }

    /**
     * Removes a child from the content (buttonRow) without destroying it.
     * @param {import('pixi.js').DisplayObject} child 
     */
    removeContent(child) {
        if (!child || child.parent !== this.buttonRow) return;
        this.buttonRow.removeChild(child);
    }

    /**
     * Toggles visibility of a child in the content row by label.
     * @param {string} label 
     * @param {boolean} isVisible 
     */
    toggleContentVisibility(label, isVisible) {
        const child = this.buttonRow.getChildByLabel(label);
        if (child) {
            child.visible = isVisible;
            if (child.layout) {
                child.layout.display = isVisible ? 'flex' : 'none';
            }
        }
    }

    /**
     * Updates the color of header elements.
     * @param {number} color - Hex color value
     */
    setTint(color) {
        cascadeColor(this, color, 'blockLabel');
        cascadeColor(this, color, 'headerLine');
    }

    destroy(options) {
        this.buttons = [];
        super.destroy(options);
    }
}
