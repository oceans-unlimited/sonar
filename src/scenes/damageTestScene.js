import { Container, Text, Graphics } from 'pixi.js';
import Panel from '../render/panel';
import { createButtonFromDef } from '../render/button';
import { wireButton } from '../behavior/buttonBehavior';
import { Colors } from '../core/uiStyle';

/**
 * DamageTestScene
 * Interactive testbed for hull damage effects.
 */
export function createDamageTestScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'damageTestScene';

    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: 30
    };

    const panel = new Panel('control', {
        label: 'damage_test_panel',
        borderColor: Colors.danger,
        padding: 30
    });

    const title = new Text({
        text: 'DAMAGE SYSTEMS TEST',
        style: { fontFamily: 'Courier New', fontSize: 24, fill: Colors.danger, fontWeight: 'bold' }
    });

    // Flash overlay for damage simulation
    const flashOverlay = new Graphics()
        .rect(0, 0, 100, 100) // Layout will stretch
        .fill({ color: 0xff0000, alpha: 0.3 });
    flashOverlay.visible = false;
    flashOverlay.layout = { width: '100%', height: '100%', position: 'absolute' };

    // Sim Button
    const btn = createButtonFromDef({
        asset: 'weapons',
        color: Colors.danger,
        profile: 'frame'
    });

    const wiredBtn = wireButton(btn, {
        id: 'sim_damage_btn',
        event: 'SIMULATE_DAMAGE',
        preset: 'ACTION'
    }, (e, d) => controller.handleEvent(e, d), ticker);
    controller.registerButton('sim_damage_btn', wiredBtn);

    const btnLabel = new Text({
        text: 'TRIGGER DAMAGE FLASH',
        style: { fontFamily: 'Courier New', fontSize: 14, fill: Colors.active }
    });
    btnLabel.layout = { marginTop: 10 };

    // Attach effect method to scene for controller access
    sceneContent.playDamageEffect = (severity) => {
        flashOverlay.visible = true;
        setTimeout(() => { flashOverlay.visible = false; }, 200);
    };

    panel.addChild(title, btn, btnLabel);
    sceneContent.addChild(panel, flashOverlay);

    return sceneContent;
}
