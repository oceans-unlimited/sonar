import { Container } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createMapPanel } from '../feature/map/mapRenderer';
import { MapController } from '../feature/map/mapController';
import { Colors } from '../core/uiStyle';
import { socketManager } from '../core/socketManager';
import { InterruptOverlay } from '../feature/interrupt/InterruptOverlay';

/**
 * SonarScene Factory
 * Reconstructs the Sonar station layout.
 *
 * @param {import('../control/sonarController').SonarController} controller - The active scene controller.
 * @param {import('pixi.js').Ticker} ticker - The application ticker.
 * @returns {Promise<Container>} The constructed scene container.
 */
export async function createSonarScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'sonarScene';

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
        backgroundColor: 0x0a1f0a,
        borderRadius: 0,
        margin: 0
    });
    sceneContent.addChild(mapPanel);

    // Provide a reference for the controller to find the mapView area
    sceneContent.mapView = mapPanel.mapView;

    // --- 2. Initialize Map Feature ---
    const mapController = new MapController();
    mapController.bindSocket(socketManager);
    mapController.bindView(sceneContent);

    // Inject the feature into the primary controller
    // Note: Interrupt and Submarine features are automatically injected by SceneManager.
    controller.bindFeatures({
        map: mapController
    });

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

    // --- 4. Stub Additional Panels (Teletype / Audio) ---
    const teletypeBlock = new ButtonBlock([], 'vertical', {
        label: 'teletype_stub',
        heading: 'Teletype Communications',
        header: true,
        line: true,
        color: Colors.primary
    });
    controlsSidebar.addChild(teletypeBlock);

    sceneContent.addChild(controlsSidebar);

    // --- 5. Interrupt Overlay ---
    const interruptOverlay = new InterruptOverlay(ticker, 'sonar');
    sceneContent.addChild(interruptOverlay);

    return sceneContent;
}
