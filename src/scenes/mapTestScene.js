import { Container } from 'pixi.js';
import { Colors, Layout } from '../core/uiStyle.js';
import { createMapPanel } from '../feature/map/mapRenderer.js';
import { createButtonFromDef } from '../render/button.js';
import Panel from '../render/panel.js';
import { MiniMap } from '../feature/map/MiniMap.js';

export const sceneKey = 'mapTestScene';
export const controllerKey = 'mapTest';

export async function createMapTestScene(controller, ticker) {
    const scene = new Container();
    scene.label = 'mapTestScene';

    scene.layout = {
        width: '80%',
        height: '90%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Layout.margin,
        gap: 20
    };

    // Create the entire map component using the new renderer.
    // We pass it the ticker, dimensions, and the layout configuration for the outer panel.
    const mapPanel = createMapPanel(ticker, '100%', '100%', {
        backgroundColor: 0x0a1f0a,
        borderRadius: 8
    });

    // Expose for controller
    scene.mapView = mapPanel.mapView;

    scene.addChild(mapPanel);

    // Add a toggle button for labels
    const toggleBtn = createButtonFromDef({
        textLabel: 'Switch Row Labels',
        textOnly: true,
        color: 0xee2828,
        profile: 'text'
    });

    // Add a mini map mode toggle button
    const miniMapBtn = createButtonFromDef({
        textLabel: 'Mini Map',
        textOnly: true,
        color: 0xee2828,
        profile: 'text',
        canonicalLabel: 'btn_toggle_minimap'
    });

    toggleBtn.on('pointertap', () => {
        controller.handleEvent('TOGGLE_ROW_LABELS');
    });

    let isMiniMap = false;
    // We can either listen to the controller event or handle it directly here since it's a test scene-only feature.
    // Handling directly in the scene makes sense because it's purely visual/layout test for the mapRenderer.
    miniMapBtn.on('pointertap', () => {
        controller.handleEvent('TOGGLE_MINI_MAP'); // still send to controller for logs/routing

        isMiniMap = !isMiniMap;

        // Find and destroy current map panel
        const currentMapPanel = scene.getChildByLabel('MapPanel') || scene.getChildByLabel('MiniMapPanel');
        if (currentMapPanel) {
            currentMapPanel.destroy({ children: true });
        }

        const width = isMiniMap ? '40%' : '100%';
        const height = isMiniMap ? '40%' : '100%';
        const layoutConfig = isMiniMap
            ? { width, height, backgroundColor: 0x0a1f0a, borderRadius: 8 }
            : { backgroundColor: 0x0a1f0a, borderRadius: 8 };

        let newMapPanel;
        if (isMiniMap) {
            const miniMap = new MiniMap(ticker, layoutConfig);
            newMapPanel = miniMap.container;
            newMapPanel.mapView = miniMap.mapView; // replicate createMapPanel interface
        } else {
            newMapPanel = createMapPanel(ticker, width, height, layoutConfig);
        }

        // Update controller's view reference if needed, and our own scene reference
        scene.mapView = newMapPanel.mapView;
        if (controller.view && controller.view.mapView) {
            controller.view.mapView = newMapPanel.mapView;
        }

        // Insert behind the UI panel
        scene.addChildAt(newMapPanel, 0);

        // Force layout engine to recalculate
        window.dispatchEvent(new Event('resize'));
    });

    const buttonPanel = new Panel('control', {
        label: 'panel_button',
        backgroundColor: 0x112211,
        borderColor: 0x28ee28,
        borderWidth: 2,
        borderRadius: 8
    });
    buttonPanel.addChild(toggleBtn);
    buttonPanel.addChild(miniMapBtn);
    scene.addChild(buttonPanel);

    return scene;
}
