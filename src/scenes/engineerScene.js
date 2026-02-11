/**
 * Engineer Scene Factory
 * Constructs the Engineer station's visual elements.
 * Uses Button, ButtonBlock, and wireButton for the new architecture.
 */

import { Container } from 'pixi.js';
import Button, { createButtonFromDef } from '../render/button';
import ButtonBlock from '../render/buttonBlock';
import { wireButton } from '../behavior/buttonBehavior';
import { SystemColors } from '../core/uiStyle';

/**
 * @param {import('pixi.js').Application} app
 * @param {object} assets
 * @param {import('../core/socketManager').socketManager} socketManager
 * @returns {Container} The scene container
 */
export async function createEngineScene(app, assets, socketManager) {
    const scene = new Container();
    scene.label = 'engineerScene';

    // Use PixiLayout on the scene container
    scene.layout = {
        width: app.screen.width,
        height: app.screen.height,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        gap: 15
    };

    // ─────────── Direction Rows ───────────
    const directions = ['N', 'E', 'W', 'S'];
    const directionColors = {
        N: 0x00aaff,
        E: 0x2ecc71,
        W: 0xf1c40f,
        S: 0xe74c3c
    };

    for (const dir of directions) {
        const color = directionColors[dir];

        // Create slot buttons for this direction
        const slotButtons = [];
        const slots = ['slot01', 'slot02', 'slot03'];

        for (const slotId of slots) {
            const btnDef = {
                asset: 'circuit_frame',
                color: color,
                profile: 'circuit'
            };
            const buttonView = createButtonFromDef(btnDef);
            slotButtons.push(buttonView);
        }

        // Create button block for this direction
        const block = new ButtonBlock(slotButtons, 'horizontal', {
            label: `block_${dir}`,
            heading: dir,
            color: color,
            header: true,
            line: true
        });

        scene.addChild(block);
    }

    // ─────────── Reactor Row ───────────
    const reactorButtons = [];
    for (let i = 1; i <= 3; i++) {
        const btnDef = {
            asset: 'reactor',
            color: SystemColors.reactor,
            profile: 'reactor'
        };
        const buttonView = createButtonFromDef(btnDef);
        reactorButtons.push(buttonView);
    }

    const reactorBlock = new ButtonBlock(reactorButtons, 'horizontal', {
        label: 'block_reactor',
        heading: 'REACTOR',
        color: SystemColors.reactor,
        header: true,
        line: true
    });

    scene.addChild(reactorBlock);

    // ─────────── Wire Buttons ───────────
    // This wiring creates the interactive behavior and returns control APIs
    // The controller will pick these up via registerButton()
    scene._buttonControls = new Map();

    scene.children.forEach(child => {
        if (child instanceof ButtonBlock) {
            child.buttons.forEach(btn => {
                if (btn instanceof Button) {
                    const profile = btn.label === 'reactor_btn' ? 'reactor' : 'circuit';
                    // Extract the ID from the button def (stored during creation)
                    const buttonId = btn.label || `btn_${Math.random().toString(36).substr(2, 6)}`;

                    const ctrl = wireButton(btn, {
                        id: buttonId,
                        profile: profile,
                        onPress: (id) => {
                            // Parse direction and slot from the block/button structure
                            const blockLabel = child.label || '';
                            const direction = blockLabel.replace('block_', '');

                            if (typeof window !== 'undefined' && window.logEvent) {
                                window.logEvent(`Button pressed: ${id} (${direction})`);
                            }

                            // Route to controller
                            if (scene._controller) {
                                scene._controller.handleEvent('CROSS_OFF', {
                                    direction,
                                    slotId: id.split('_')[1] || id
                                });
                            }
                        }
                    });
                    scene._buttonControls.set(buttonId, ctrl);
                }
            });
        }
    });

    return scene;
}
