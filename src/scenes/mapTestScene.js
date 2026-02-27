import { Container } from 'pixi.js';
import { Colors, Layout } from '../core/uiStyle.js';
import { createMapPanel } from '../feature/map/mapRenderer.js';
import { createButtonFromDef } from '../render/button.js';
import Panel from '../render/panel.js';

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
        textLabel: 'Switch Row Labels',
        textOnly: true,
        color: 0xee2828,
        profile: 'text'
    });

    toggleBtn.on('pointertap', () => {
        controller.handleEvent('TOGGLE_ROW_LABELS');
    });

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
