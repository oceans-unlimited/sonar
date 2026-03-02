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

    // 1. Create the Map Panel
    const mapPanel = createMapPanel(ticker, '100%', '100%', {
        backgroundColor: 0x0a1f0a,
        borderRadius: 8
    });

    // 2. Register Feature
    // We bind the map feature to the scene's controller
    if (controller && mapPanel.controller) {
        controller.bindFeatures({ map: mapPanel.controller });
    }

    // Expose mapView for compatibility with debug scenarios (e.g., map_pristine.js)
    scene.mapView = mapPanel.mapView;

    scene.addChild(mapPanel);

    // 3. Control Buttons
    const toggleBtn = createButtonFromDef({
        textLabel: 'Switch Row Labels',
        textOnly: true,
        color: 0xee2828,
        profile: 'text'
    });

    toggleBtn.on('pointertap', () => {
        // Route through the feature registry if available, otherwise fallback to direct controller
        if (controller?.features?.map) {
            controller.features.map.execute('TOGGLE_LABELS');
        } else {
            mapPanel.controller.execute('TOGGLE_LABELS');
        }
    });

    // 4. Button Panel
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
