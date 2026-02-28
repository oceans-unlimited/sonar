import { Container } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createButtonFromDef } from '../render/button';
import { wireButton } from '../behavior/buttonBehavior';
import { createMapPanel } from '../feature/map/mapRenderer';
import { MapController } from '../control/mapController';
import { Colors } from '../core/uiStyle';
import { socketManager } from '../core/socketManager';

/**
 * ConnScene Factory
 * Reconstructs the legacy Conn station layout using the new OOP architecture.
 *
 * @param {import('../control/connController').ConnController} controller - The active scene controller.
 * @param {import('pixi.js').Ticker} ticker - The application ticker.
 * @returns {Promise<Container>} The constructed scene container.
 */
export async function createConnScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'connScene';

    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.background,
        padding: 15,
        gap: 15
    };

    // --- 1. Map Panel (Left) ---
    // The Map occupies the majority of the screen space.
    const mapPanel = createMapPanel(ticker, '100%', '100%', {
        // flexGrow: 1,
        backgroundColor: 0x0a1f0a,
        borderRadius: 0,
        margin: 0
    });
    sceneContent.addChild(mapPanel);

    // Provide a reference for the controller to find the mapView area
    sceneContent.mapView = mapPanel.mapView;

    // --- 2. Initialize Map Feature ---
    // As per user request, register the map as a 'feature' with the controller.
    const mapController = new MapController();
    mapController.bindSocket(socketManager);
    mapController.bindView(sceneContent);

    // Inject the feature into the primary controller
    controller.bindFeatures({ map: mapController });

    // --- 3. Control Panel (Right Sidebar) ---
    const controlsSidebar = new Panel('control', {
        label: 'controlsSidebar',
        borderColor: Colors.primary,
        borderWidth: 2,
        padding: 20
    });
    controlsSidebar.setAlpha(0);

    controlsSidebar.layout.width = '25%';
    controlsSidebar.layout.minWidth = 300;
    controlsSidebar.layout.height = '100%';
    controlsSidebar.layout.flexGrow = 0;
    controlsSidebar.layout.flexShrink = 0;

    // --- 4. Helm Controls ---
    const helmDirections = [
        { id: 'w', label: 'W', rot: Math.PI },
        { id: 'n', label: 'N', rot: -Math.PI / 2 },
        { id: 's', label: 'S', rot: Math.PI / 2 },
        { id: 'e', label: 'E', rot: 0 }
    ];

    const helmButtons = helmDirections.map(dir => {
        const btn = createButtonFromDef({
            asset: 'arrow',
            textLabel: dir.label,
            color: Colors.primary,
            profile: 'basic',
            canonicalLabel: `helm_${dir.id}`
        });

        // Rotate the arrow to face the correct direction
        const bg = btn.content?.getChildByLabel("btnBackground");
        console.log('background: ', bg);
        if (bg) bg.rotation = dir.rot;

        const behavior = wireButton(btn, {
            id: `helm_${dir.id}`,
            onPress: () => controller.handleEvent('MOVE_HELM', { direction: dir.canonicalLabel })
        });

        controller.registerButton(behavior.id, behavior);
        return btn;
    });

    // Helm layout: Grid-like 3x3 pattern using ButtonBlock
    // For now, we'll put them in a vertical block or simple grid if layout allows.
    // ButtonBlock supports 'horizontal' and 'vertical' patterns.
    const helmBlock = new ButtonBlock(helmButtons, 'horizontal', {
        label: 'helm_controls',
        heading: 'Helm',
        header: true,
        line: true,
        color: Colors.primary
    });

    controlsSidebar.addChild(helmBlock);

    // --- 5. Stub Additional Panels ---
    // Recreate the general feel of the control panel with placeholders
    const weaponsBlock = new ButtonBlock([], 'horizontal', {
        label: 'weapons_stub',
        heading: 'Weapons System',
        header: true,
        line: true,
        color: Colors.primary
    });
    controlsSidebar.addChild(weaponsBlock);

    sceneContent.addChild(controlsSidebar);

    return sceneContent;
}
