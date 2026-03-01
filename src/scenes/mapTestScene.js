import { Container } from 'pixi.js';
import { Colors, Layout } from '../core/uiStyle.js';
import { createMapPanel } from '../feature/map/mapRenderer.js';
import { createButtonFromDef } from '../render/button.js';
import Panel from '../render/panel.js';

export const sceneKey = 'mapTestScene';
export const controllerKey = 'mapTest';

/**
 * mapTestScene
 * A dedicated scene for testing map rendering, layout, and filtering logic.
 */
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

    // 1. Create the Map Panel (Full Scale)
    // The MapController is embedded inside createMapPanel automatically.
    const mapPanel = createMapPanel(ticker, '100%', '100%', {
        backgroundColor: 0x0a1f0a,
        borderRadius: 8
    });

    // Expose mapView for the scene level if needed
    scene.mapView = mapPanel.mapView;
    scene.addChild(mapPanel);

    // 2. Control Buttons
    const toggleBtn = createButtonFromDef({
        textLabel: 'Switch Row Labels',
        textOnly: true,
        color: 0xee2828,
        profile: 'text'
    });

    toggleBtn.on('pointertap', () => {
        // This will be handled by the embedded MapController
        mapPanel.controller.handleEvent('TOGGLE_ROW_LABELS');
    });

    // 3. Selection Test Logic
    // We bind a listener to the mapView's signals to verify interaction works
    scene.mapView.viewBox.on('map:clicked', (data) => {
        console.log('[mapTestScene] Map Clicked:', data);
    });

    // 4. Button Panel (Sidebar)
    const buttonPanel = new Panel('control', {
        label: 'panel_button',
        backgroundColor: 0x112211,
        borderColor: 0x28ee28,
        borderWidth: 2,
        borderRadius: 8
    });
    
    buttonPanel.addChild(toggleBtn);
    scene.addChild(buttonPanel);

    return scene;
}
