import { Container, Text, Graphics } from 'pixi.js';
import { buttonBlockPatterns } from './layouts';
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
        const chosenPattern = buttonBlockPatterns[layoutPattern] || buttonBlockPatterns.horizontal;

        this.layout = {
            ...chosenPattern,
            flexDirection: 'column', // Force column to stack Header above ButtonRow
            justifyContent: 'flex-start',
            gap: 5
        };

        // 2. Render Header (Optional)
        if (header && heading) {
            this.createHeader(heading, color, line);
        }

        // 3. Render Button Content
        this.createContentRow(chosenPattern);
    }

    createHeader(headingText, color, showLine) {
        const headerContainer = new Container({
            label: 'headerContainer'
        });
        headerContainer.layout = {
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
                fontFamily: 'Orbitron, sans-serif', // Using standard app font
                fontSize: 24, // Increased size
                fill: 0xFFFFFF,
                fontWeight: 'bold',
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
        headerContainer.addChild(text);

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
            headerContainer.addChild(graphics);
        }

        this.addChild(headerContainer);
    }

    createContentRow(pattern) {
        const buttonRow = new Container({
            label: 'buttonRow'
        });

        // Inherit the requested pattern (horizontal/vertical) for the buttons themselves
        buttonRow.layout = {
            height: 70,
            ...pattern,
        };

        this.buttons.forEach(btn => buttonRow.addChild(btn));
        this.addChild(buttonRow);
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