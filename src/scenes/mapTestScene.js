import { Container } from 'pixi.js';
import { Colors, Layout } from '../core/uiStyle.js';
import { createMapPanel } from '../feature/map/mapRenderer.js';
import { createButtonFromDef } from '../render/button.js';

export const sceneKey = 'mapTestScene';
export const controllerKey = 'mapTest';

export async function createMapTestScene(controller, ticker) {
    const scene = new Container();
    scene.label = 'mapTestScene';

    scene.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Layout.margin
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
        label: 'TOGGLE LABELS',
        color: Colors.primary,
        textOnly: true,
        profile: 'basic'
    });

    toggleBtn.layout = {
        scale: 3,
    };

    toggleBtn.on('pointertap', () => {
        controller.handleEvent('TOGGLE_ROW_LABELS');
    });

    scene.addChild(toggleBtn);

    return scene;
}
