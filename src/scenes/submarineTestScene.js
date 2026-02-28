import { Container, Text } from 'pixi.js';
import Panel from '../render/panel';
import { Colors } from '../core/uiStyle';

/**
 * SubmarineTestScene
 * Simple diagnostic view for the submarine feature.
 */
export function createSubmarineTestScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'submarineTestScene';

    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: 20
    };

    const panel = new Panel('control', {
        label: 'sub_diag_panel',
        borderColor: Colors.text,
        padding: 30
    });

    const title = new Text({
        text: 'SUBMARINE DIAGNOSTICS',
        style: { fontFamily: 'Courier New', fontSize: 24, fill: Colors.text, fontWeight: 'bold' }
    });

    const statusText = new Text({
        text: 'Awaiting State...',
        style: { fontFamily: 'Courier New', fontSize: 18, fill: Colors.text }
    });

    panel.addChild(title);
    panel.addChild(statusText);
    sceneContent.addChild(panel);

    // Sync with state updates
    controller.onGameStateUpdate = (state) => {
        const health = controller.getHealth();
        const subState = controller.getState();
        statusText.text = `STATE: ${subState}
HEALTH: ${health}/4`;
    };

    return sceneContent;
}
