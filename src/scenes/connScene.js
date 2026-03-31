import { Container } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createButtonFromDef } from '../render/button';
import { wireButton } from '../behavior/buttonBehavior';
import { createMapPanel } from '../feature/map/mapRenderer';
import { MapController } from '../feature/map/mapController';
import { Colors, SystemColors } from '../core/uiStyle';
import { socketManager } from '../core/socketManager';
import { InterruptOverlay } from '../feature/interrupt/InterruptOverlay';
import { teletypeManager } from '../feature/teletype/TeletypeManager.js';

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
    controlsSidebar.layout.flexGrow = 0;
    controlsSidebar.layout.flexShrink = 0;

    // --- 3. Helm Controls ---
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
        console.log(`[ConnScene] Registered button: ${behavior.id}`);
        return btn;
    });

    const helmBlock = new ButtonBlock(helmButtons, 'horizontal', {
        label: 'helm_controls',
        heading: 'Helm',
        header: true,
        line: true,
        color: Colors.primary
    });

    controlsSidebar.addChild(helmBlock);

    // --- 4. Silent Running Toggle ---
    // Vessel subsystem: uses SystemColors.vessel (yellow)
    const silentBtn = createButtonFromDef({
        asset: 'empty',
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

    controlsSidebar.addChild(silentBlock);

    const weaponsBlock = new ButtonBlock([], 'horizontal', {
        label: 'weapons_stub',
        heading: 'Weapons System',
        header: true,
        line: true,
        color: Colors.primary
    });
    controlsSidebar.addChild(weaponsBlock);

    // --- 6. Teletype Terminal ---
    teletypeManager.mount(controlsSidebar, {
        width: '100%',
        height: 120,
        maxRows: 10,
        layout: { marginTop: 10 }
    });
    
    // Register the teletype feature with the controller registry
    controller.features.set('teletype', teletypeManager);
    
    sceneContent.on('destroyed', () => teletypeManager.unmount());

    sceneContent.addChild(controlsSidebar);

    // --- 7. Interrupt Overlay ---
    const interruptOverlay = new InterruptOverlay(ticker, 'co');
    sceneContent.addChild(interruptOverlay);

    return sceneContent;
}
