import { Container } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createButtonFromDef } from '../render/button';
import { wireButton } from '../behavior/buttonBehavior';
import { createMapPanel } from '../feature/map/mapRenderer';
import { MapController } from '../feature/map/mapController';
import { Colors, SystemColors } from '../core/uiStyle';
import { socketManager } from '../core/socketManager';
import { InterruptCoordinator } from '../feature/interrupt/InterruptCoordinator.js';
import { teletypeManager } from '../feature/teletype/TeletypeManager.js';
import { damageManager } from '../feature/damage/DamageManager.js';

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
    const mapController = controller.features.get('map');
    const mapPanel = createMapPanel(ticker, '100%', '100%', {
        backgroundColor: 0x0a1f0a,
        borderRadius: 0,
        margin: 0
    }, mapController);
    sceneContent.addChild(mapPanel);

    // Provide a reference for the controller to find the mapView area
    sceneContent.mapView = mapPanel.mapView;

    // --- 2. Control Panel (Right Sidebar) ---
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
        height: 10,
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

    // --- 3. Helm Controls (Added to normalContent) ---
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
        if (bg) bg.rotation = dir.rot;

        const behavior = wireButton(btn, {
            id: btn.canonicalLabel,
            onPress: () => controller.handleEvent('MOVE_HELM', { direction: dir.id.toUpperCase() })
        });

        controller.registerButton(behavior.id, behavior);
        return btn;
    });

    const helmBlock = new ButtonBlock(helmButtons, 'horizontal', {
        label: 'helm_controls',
        heading: 'Helm',
        header: true,
        line: true,
        color: Colors.primary
    });

    normalContent.addChild(helmBlock);

    // --- 4. Silent Running Toggle (Added to normalContent) ---
    const silentBtn = createButtonFromDef({
        textLabel: 'Silence',
        color: SystemColors.vessel,
        profile: 'text',
        textOnly: true,
        canonicalLabel: 'silent_running'
    });

    const silentBehavior = wireButton(silentBtn, {
        id: 'silent_running',
        onPress: () => controller.handleEvent('TOGGLE_STEALTH')
    });
    controller.registerButton(silentBehavior.id, silentBehavior);

    const silentBlock = new ButtonBlock([silentBtn], 'horizontal', {
        label: 'stealth_controls',
        heading: 'Vessel Systems',
        header: true,
        line: true,
        color: SystemColors.vessel
    });

    normalContent.addChild(silentBlock);

    const weaponsBlock = new ButtonBlock([], 'horizontal', {
        label: 'weapons_stub',
        heading: 'Weapons System',
        header: true,
        line: true,
        color: Colors.primary
    });
    normalContent.addChild(weaponsBlock);

    // Register features with controller
    controller.features.set('damage', damageManager);
    controller.features.set('teletype', teletypeManager);

    sceneContent.on('destroyed', () => {
        damageManager.unmount();
        teletypeManager.unmount();
    });

    sceneContent.addChild(controlsSidebar);

    // --- 7. Interrupt Coordinator ---
    // Non-visual coordinator swaps normalContent for interrupt panels
    const interruptCoordinator = new InterruptCoordinator(ticker, 'co');
    interruptCoordinator.bindView(sceneContent);

    return sceneContent;
}

