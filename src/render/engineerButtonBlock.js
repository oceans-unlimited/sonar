import { Container, Text, Sprite, Assets } from 'pixi.js';
import { LayoutContainer } from '@pixi/layout/components';
import { buttonBlockPatterns } from './layouts';
import { Colors, Fonts } from '../core/uiStyle';
import { cascadeColor } from './util/colorOps.js';

/**
 * EngineerButtonBlock
 * Specialized button block for the Engineer scene.
 * Uses a 'directionFrame' texture and positions the direction label 
 * absolutely on top of the frame.
 */
export default class EngineerButtonBlock extends Container {
    constructor(buttons = [], layoutPattern = 'horizontal', config = {}) {
        super();

        const {
            label,          // Selector ID / Cardinal Direction
            color = 0xFFFFFF
        } = config;

        this.label = label; // e.g., 'N', 'E', 'S', 'W'
        this.buttons = buttons;

        // 1. Root Layout (The whole block)
        this.layout = {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
        };

        // 2. Direction Frame (The "Header" replacement)
        // This sprite will act as the background/frame for the row
        this.reactorWrapper = new Container({
            label: 'reactorWrapper',
            layout: {
                width: 224,
                height: 82,
                justifyContent: 'flex-start',
                alignItems: 'center',
                padding: 8,
                gap: 6,
            },
        });

        this.frame = new Sprite(Assets.get('directionFrame'));
        this.frame.label = 'directionFrame';
        this.frame.tint = color;

        // The frame should probably be at the bottom of the stack or used as a container background
        // But the prompt says "overlay texture to the top layer", let's make it a sibling or background.
        // Actually, if it's an overlay for the buttonRows, we can wrap the button row.

        this.frame.layout = {
            width: 'intrinsic',
            height: 'intrinsic',
            position: 'absolute',
            left: 0,
            zIndex: 5
        };

        // 3. Direction Label (N, E, S, W)
        // Positioned absolutely above the frame towards the right
        this.directionLabel = new Text({
            text: label.toUpperCase(),
            style: {
                fontFamily: Fonts.headerBold,
                fontSize: 36,
                fill: Colors.background,
                fontWeight: 'bold',
                letterSpacing: 2
            }
        });
        this.directionLabel.label = 'directionLabel';
        this.directionLabel.tint = color;

        this.directionLabel.layout = {
            position: 'absolute',
            right: 35,
            top: 24,
            zIndex: 10 // Above the frame
        };

        // 4. Circuit Row
        // const chosenPattern = buttonBlockPatterns[layoutPattern];
        this.circuitRow = new Container({
            label: 'circuitRow',
            layout: {
                width: 'auto',
                height: 82,
                gap: 8,
            },
        });
        // this.circuitRow.layout = {
        //     ...chosenPattern,
        //     zIndex: 0
        // };

        this.buttons.forEach((btn, i) => {
            if (i < 3) {
                this.reactorWrapper.addChild(btn);
            } else {
                this.circuitRow.addChild(btn);
            }
        });

        // Assemble: Frame holds the label and buttons? 
        // Or buttons sit on the frame?
        // Let's make a container for the "Interaction Area" that has the frame as background
        // const interactionArea = new Container();
        // interactionArea.layout = {
        //     width: 'intrinsic',
        //     height: 'intrinsic',
        //     position: 'relative'
        // };

        this.reactorWrapper.addChild(this.frame);
        this.reactorWrapper.addChild(this.directionLabel);
        this.addChild(this.reactorWrapper);
        this.addChild(this.circuitRow);


        // this.addChild(interactionArea);
    }

    /**
     * Updates the color of the frame and label.
     * @param {number} color - Hex color value
     */
    setTint(color) {
        this.frame.tint = color;
        this.directionLabel.tint = color;
    }

    destroy(options) {
        this.buttons = [];
        super.destroy(options);
    }
}
