import { Container } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createMapPanel } from '../feature/map/mapRenderer';
import { MapController } from '../feature/map/mapController';
import { Colors } from '../core/uiStyle';
import { socketManager } from '../core/socketManager';
import { InterruptCoordinator } from '../feature/interrupt/InterruptCoordinator.js';
import { damageManager } from '../feature/damage/DamageManager.js';
import { teletypeManager } from '../feature/teletype/TeletypeManager.js';

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
    controlsSidebar.layout.flexDirection = 'column';
    controlsSidebar.layout.justifyContent = 'space-between';

    // A. Damage UI (Top - Persistent)
    const damageContainer = new Container();
    damageContainer.label = 'damageContainer';
    damageContainer.layout = { width: '100%', height: 'auto', marginBottom: 10 };
    controlsSidebar.addChild(damageContainer);

    damageManager.mount(ticker, sceneContent, damageContainer, {
        layout: { width: '100%' }
    });

    // B. Swap Wrapper (Middle)
    const swapWrapper = new Container();
    swapWrapper.label = 'swapWrapper';
    swapWrapper.layout = {
        flexGrow: 1,
        width: '100%',
        flexDirection: 'column',
        gap: 15,
        overflow: 'hidden'
    };
    controlsSidebar.addChild(swapWrapper);

    // Normal Content Container
    const normalContent = new Container();
    normalContent.label = 'normalContent';
    normalContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        gap: 15
    };
    swapWrapper.addChild(normalContent);

    // C. Teletype Terminal (Bottom - Persistent)
    const teletypeContainer = new Container();
    teletypeContainer.label = 'teletypeContainer';
    teletypeContainer.layout = { width: '100%', height: 150, marginTop: 10 };
    controlsSidebar.addChild(teletypeContainer);

    teletypeManager.mount(teletypeContainer, {
        width: '100%',
        height: 150,
        maxRows: 10
    });

    // --- 4. Sonar Specific Controls (Added to normalContent) ---
    const teletypeBlock = new ButtonBlock([], 'vertical', {
        label: 'teletype_stub',
        heading: 'Radio Comms',
        header: true,
        line: true,
        color: Colors.primary
    });
    normalContent.addChild(teletypeBlock);

    // Register features with controller
    controller.features.set('damage', damageManager);
    controller.features.set('teletype', teletypeManager);

    sceneContent.on('destroyed', () => {
        damageManager.unmount();
        teletypeManager.unmount();
    });

    sceneContent.addChild(controlsSidebar);

    // --- 5. Interrupt Coordinator ---
    // Non-visual coordinator swaps normalContent for interrupt panels
    const interruptCoordinator = new InterruptCoordinator(ticker, 'sonar');
    interruptCoordinator.bindView(sceneContent);

    return sceneContent;
}

