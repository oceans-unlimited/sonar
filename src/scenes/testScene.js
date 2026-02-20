/**
 * Test Scene Factory
 * Showcase for Panel, ButtonBlock, and Button with interactive wiring.
 */

import { Container } from 'pixi.js';
import Button, { createButtonFromDef } from '../render/button';
import ButtonBlock from '../render/buttonBlock';
import Panel from '../render/panel';
import Card from '../render/card';
import { wireButton } from '../behavior/buttonBehavior';
import { Text } from 'pixi.js';

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
        flexWrap: 'wrap',
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

    const gaugeFrames = ['gauge_04.png', 'gauge_25.png', 'gauge_50.png', 'gauge_75.png', 'gauge_100.png'];

    const linkedButtons = [
        createButtonFromDef({ asset: 'torpedo_sys', color: 0xe74c3c, profile: 'basic' }),
        createButtonFromDef({ asset: 'mine_sys', color: 0xe74c3c, profile: 'basic' }),
        createButtonFromDef({ asset: gaugeFrames[2], color: 0xe74c3c, profile: 'basic' })
    ];

    const gaugeBtn = linkedButtons[2];

    const linkedBlock = new ButtonBlock(linkedButtons, 'horizontal', {
        label: 'block_linked',
        heading: 'LINKED SYSTEM',
        color: 0xe74c3c,
        header: true,
        line: true
    });

    panel1.addChild(actionBlock);
    panel1.addChild(linkedBlock);
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
        let subProfile = null;
        if (i % 2 === 0) {
            subProfile = 'sub_profileA';
        } else {
            subProfile = 'sub_profileB';
        }
        const btnDef = {
            asset: subProfile,
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


    // panel2.addChild(linkedBlock);
    panel2.addChild(infoBlock);
    scene.addChild(panel2);

    // ─────────── Panel 3: Card Demo ───────────
    const panel3 = new Panel('control', {
        label: 'panel_card',
        backgroundColor: '#112211',
        borderColor: '#28ee28',
        borderWidth: 2,
        borderRadius: 8
    });

    const nameplate = new Card('nameplate', {
        label: 'test_card',
        backgroundColor: '#003300',
        borderColor: '#00ff00',
        borderWidth: 1
    });

    const playerName = new Text({
        text: "PLAYER ONE",
        style: {
            fontFamily: 'Orbitron',
            fontSize: 16,
            fontWeight: 'bold',
            fill: '#00ff00'
        }
    });
    playerName.layout = { marginRight: 'auto' };

    const toggleBtn = createButtonFromDef({
        asset: 'thumb',
        color: 0x00ff00,
        profile: 'basic'
    });
    toggleBtn.setScale(0.65);

    const vacateBtn = createButtonFromDef({
        label: '❌',
        textOnly: true,
        color: 0x00ff00,
        profile: 'basic'
    });
    vacateBtn.layout = { marginLeft: 10 };

    nameplate.addChild(playerName, toggleBtn, vacateBtn);
    panel3.addChild(nameplate);
    scene.addChild(panel3);

    // ─────────── Panel 4: Text Button Demo ───────────
    const panel4 = new Panel('control', {
        label: 'panel_text_buttons',
        backgroundColor: '#221111',
        borderColor: '#ee2828',
        borderWidth: 2,
        borderRadius: 8
    });

    const textButtons = [
        createButtonFromDef({
            label: 'TEXT ONLY',
            textOnly: true,
            color: 0xee2828,
            profile: 'basic'
        }),
        createButtonFromDef({
            asset: 'weapons',
            label: 'HYBRID',
            color: 0xee2828,
            profile: 'frame'
        }),
        createButtonFromDef({
            label: 'CLICK TO CHANGE',
            textOnly: true,
            color: 0xee2828,
            profile: 'basic'
        })
    ];

    const textBlock = new ButtonBlock(textButtons, 'vertical', {
        label: 'block_text_demo',
        heading: 'TEXT BUTTONS',
        color: 0xee2828,
        header: true,
        line: true
    });

    panel4.addChild(textBlock);
    scene.addChild(panel4);

    // ─────────── Wire Action Buttons ───────────
    actionButtons.forEach((btn, i) => {
        const key = testSystems[i];
        const behavior = wireButton(btn, {
            id: `test_${key}`,
            profile: 'frame',
            onPress: () => controller.handleEvent('TEST_ACTION', { id: `test_${key}`, system: key })
        });
        controller.registerButton(behavior.id, behavior);
    });

    // ─────────── Wire Info Buttons ───────────
    infoButtons.forEach((btn, i) => {
        const behavior = wireButton(btn, {
            id: `info_btn_${i}`,
            profile: 'basic',
            onPress: () => controller.handleEvent('INFO_ACTION', { id: `info_btn_${i}`, index: i })
        });
        controller.registerButton(behavior.id, behavior);
    });

    // ─────────── Wire Linked Block ───────────
    const linkedBehavior = wireButton(linkedBlock.buttonRow, {
        id: 'linked_subsystem',
        profile: 'block',
        onPress: () => {
            // Cycle gauge level on press to test UI effects
            const currentLevel = linkedBlock._level || 2;
            const nextLevel = (currentLevel + 1) % gaugeFrames.length;
            linkedBlock.setGaugeLevel(nextLevel);
            controller.handleEvent('BLOCK_ACTION', { id: 'linked_subsystem', level: nextLevel });
        }
    });
    controller.registerButton(linkedBehavior.id, linkedBehavior);

    // Add setGaugeLevel to linkedBlock for testing
    linkedBlock.setGaugeLevel = (level) => {
        linkedBlock._level = level;
        const texture = gaugeFrames[level];
        if (texture) {
            gaugeBtn.setAsset(texture);
        }
    };
    linkedBlock._level = 2; // Initial middle state

    // ─────────── Wire Card Children ───────────
    const cardToggleBehavior = wireButton(toggleBtn, {
        id: 'card_toggle',
        profile: 'basic',
        onPress: () => controller.handleEvent('CARD_TOGGLE', { id: 'card_toggle' })
    });
    controller.registerButton(cardToggleBehavior.id, cardToggleBehavior);

    const vacateBehavior = wireButton(vacateBtn, {
        id: 'vacate',
        profile: 'basic',
        onPress: () => controller.handleEvent('VACATE', { id: 'vacate' })
    });
    controller.registerButton(vacateBehavior.id, vacateBehavior);

    // Register visual blocks for completeness
    controller.registerVisual('block_actions', actionBlock);
    controller.registerVisual('block_info', infoBlock);
    controller.registerVisual('block_linked', linkedBlock);
    controller.registerVisual('test_card', nameplate);

    // ─────────── Wire Text Buttons ───────────
    textButtons.forEach((btn, i) => {
        const behavior = wireButton(btn, {
            id: `text_btn_${i}`,
            profile: i === 1 ? 'frame' : 'basic',
            onPress: () => {
                if (i === 2) {
                    btn.setTextLabel('CHANGED!');
                }
                controller.handleEvent('TEXT_BUTTON_ACTION', { id: `text_btn_${i}`, index: i });
            }
        });
        controller.registerButton(behavior.id, behavior);
    });

    controller.registerVisual('block_text_demo', textBlock);

    return scene;
}
