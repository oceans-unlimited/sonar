import { SYSTEM_ASSETS } from '../render/constants/systemAssets.js';
import { Container, Text } from 'pixi.js';
import { createButtonFromDef } from '../render/button.js';
import ButtonBlock from '../render/buttonBlock.js';
import { wireButton } from '../behavior/buttonBehavior.js';
import Panel from '../render/panel.js';
import { Colors } from '../core/uiStyle.js';

/**
 * Builds the Test scene graph.
 * 
 * @param {Object} controller - The active SceneController instance.
 * @param {import('pixi.js').Ticker} ticker - The application ticker.
 * @returns {Container} The constructed scene container.
 */

export function createTestScene(controller, ticker) {
    const sceneContent = new Container({
        label: 'testScene',
        layout: {
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
        }
    });

    // 1. Create a Test Panel
    const testPanel = new Panel('control', { 
        label: 'test_panel_1',
        backgroundColor: null,
        borderColor: Colors.text,
        borderWidth: 4,
        borderRadius: 12
    });
    
    // Register visual for controller access
    controller.registerVisual('test_panel_1', testPanel);
    
    sceneContent.addChild(testPanel);
  
    // 3. Create a Button Block with a Trigger Button
    // This button will trigger 'TOGGLE_HEADER' which the controller handles
    const btnDef = {
        id: 'color_trigger_btn',
        asset: 'reactor',
        color: Colors.primary,
        profile: 'basic',
    };
    
    const button = createButtonFromDef(btnDef);
    
    // Wire the button to the controller
    const wiredAPI = wireButton(
        button,
        { id: btnDef.id, event: 'TOGGLE_HEADER', preset: 'TOGGLE' },
        (e, d) => controller.handleEvent(e, d),
        ticker
    );
    controller.registerButton(btnDef.id, wiredAPI);

    // 4. Create a Cycle Border Button
    const cycleBtnDef = {
        id: 'cycle_border_btn',
        asset: 'vessel',
        color: Colors.sonar,
        profile: 'basic',
    };
    const cycleButton = createButtonFromDef(cycleBtnDef);
    const cycleWiredAPI = wireButton(
        cycleButton,
        { id: cycleBtnDef.id, event: 'CYCLE_BORDER', preset: 'ACTION' },
        (e, d) => controller.handleEvent(e, d),
        ticker
    );
    controller.registerButton(cycleBtnDef.id, cycleWiredAPI);

    const blockConfig = {
        heading: 'Control Systems',
        label: 'test_block_label',
        color: 0xFFFFFF,
        header: true,
        line: true
    };
    
    const buttonBlock = new ButtonBlock([button, cycleButton], 'horizontal', blockConfig);
    
    // Register the block as a visual so the controller can tint its header
    controller.registerVisual('test_block', buttonBlock);
    
    testPanel.addChild(buttonBlock);

    return sceneContent;
}
    