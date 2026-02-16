/**
 * Test Scene Factory
 * Showcase for Panel, ButtonBlock, and Button with interactive wiring.
 */

import { Container } from 'pixi.js';
import Button, { createButtonFromDef } from '../render/button';
import ButtonBlock from '../render/buttonBlock';
import Panel from '../render/panel';
import { wireButton } from '../behavior/buttonBehavior';

/**
 * @param {import('../control/baseController').BaseController} controller
 * @returns {Container}
 */
export async function createTestScene(controller, ticker) {
    const scene = new Container();
    scene.label = 'testScene';

    scene.layout = {
        width: 'auto',
        height: 'auto',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 30,
        gap: 30
    };

    // ─────────── Panel 1: Action Buttons ───────────
    const panel1 = new Panel('control', {
        label: 'panel_actions',
        backgroundColor: 0x112211,
        borderColor: 0x28ee28,
        borderWidth: 2,
        borderRadius: 8
    });

    // Create some test buttons
    const actionButtons = [];
    const testSystems = ['vessel', 'weapons', 'detection'];
    const testColors = [0x3498db, 0xe74c3c, 0x2ecc71];

    for (let i = 0; i < testSystems.length; i++) {
        const btnDef = {
            asset: testSystems[i],
            color: testColors[i],
            profile: 'frame'
        };
        actionButtons.push(createButtonFromDef(btnDef));
    }

    const actionBlock = new ButtonBlock(actionButtons, 'horizontal', {
        label: 'block_actions',
        heading: 'SYSTEMS',
        color: 0x28ee28,
        header: true,
        line: true
    });

    panel1.addChild(actionBlock);
    scene.addChild(panel1);

    // ─────────── Panel 2: Info Buttons ───────────
    const panel2 = new Panel('control', {
        label: 'panel_info',
        backgroundColor: '#111122',
        borderColor: '#3498db',
        borderWidth: 2,
        borderRadius: 8
    });

    const infoButtons = [];
    for (let i = 0; i < 4; i++) {
        const btnDef = {
            asset: 'sub_profileA',
            color: 0x9b59b6,
            profile: 'basic'
        };
        infoButtons.push(createButtonFromDef(btnDef));
    }

    const infoBlock = new ButtonBlock(infoButtons, 'vertical', {
        label: 'block_info',
        heading: 'INFO',
        color: 0x9b59b6,
        header: true,
        line: true
    });

    panel2.addChild(infoBlock);
    scene.addChild(panel2);

    // ─────────── Wire All Buttons ───────────
    scene._buttonControls = new Map();

    const allBlocks = [actionBlock, infoBlock];
    for (const block of allBlocks) {
        block.buttons.forEach(btn => {
            if (btn instanceof Button) {
                const ctrl = wireButton(btn, {
                    id: btn.label || `test_btn`,
                    profile: 'frame',
                    onPress: (id) => {
                        if (typeof window !== 'undefined' && window.logEvent) {
                            window.logEvent(`Test button pressed: ${id}`);
                        }
                    }
                });
                scene._buttonControls.set(ctrl.id, ctrl);
            }
        });
    }

    return scene;
}
