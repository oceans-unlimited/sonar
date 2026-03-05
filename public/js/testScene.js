/**
 * Test Scene Factory
 * Demonstration of the "Submarine View Model" and "Persistent Features" architecture.
 * Displays live facts from the Submarine Feature rather than raw socket data.
 */

import { Container, Text } from 'pixi.js';
import Panel from '../../src/render/panel';
import { Colors } from '../../src/core/uiStyle';

export async function createTestScene(controller, ticker) {
    const scene = new Container();
    scene.label = 'testScene';

    scene.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: 30
    };

    // ─────────── Display Panel ───────────
    const panel = new Panel('control', {
        label: 'logic_test_panel',
        borderColor: Colors.primary,
        padding: 30
    });

    const title = new Text({
        text: 'REALTIME ENGINE TESTBED',
        style: { fontFamily: 'Courier New', fontSize: 24, fill: Colors.primary, fontWeight: 'bold' }
    });

    const statusText = new Text({
        text: 'Awaiting Submarine Facts...',
        style: { fontFamily: 'Courier New', fontSize: 18, fill: Colors.active }
    });

    panel.addChild(title, statusText);
    scene.addChild(panel);

    // ─────────── Logical Integration ───────────

    /**
     * The Controller is injected with persistent features by the SceneManager.
     * We subscribe to high-signal fact changes from the Submarine View Model.
     */
    controller.onFeaturesBound = () => {
        const subFeature = controller.features.submarine;
        
        // Listen for identity resolution (Who am I?)
        subFeature.on('identity:resolved', ({ sub, role }) => {
            console.log(`[TestScene] Identity Resolved: Sub ${sub._id} as ${role}`);
            updateDisplay(sub, role);
        });

        // Listen for specific fact changes on the ownship sub
        subFeature.subscribeToOwnship('sub:moved', () => {
            updateDisplay(subFeature.getOwnship(), subFeature.getLocalRole());
        });

        subFeature.subscribeToOwnship('sub:stateChanged', () => {
            updateDisplay(subFeature.getOwnship(), subFeature.getLocalRole());
        });
    };

    function updateDisplay(sub, role) {
        if (!sub) return;

        const pos = sub.getPosition();
        const health = sub.getHealth();
        const status = sub.getStatusMessage();

        statusText.text = `ROLE: ${role.toUpperCase()}
SUB ID: ${sub._id}
POSITION: ${pos.alphaNumeric} (${pos.row}, ${pos.col})
HEALTH: ${health.current}/${health.max}
LOGIC: ${status}
MOVE GATING: ${sub.canMove() ? 'UNLOCKED' : 'LOCKED'}`;
    }

    return scene;
}
