import * as PIXI from 'pixi.js';
import { Colors, Font, Layout } from '../core/uiStyle.js';
import { MapViewArea } from '../feature/map/components/MapViewArea.js';
import { MiniMap } from '../feature/map/components/MiniMap.js';

export const sceneKey = 'mapTestScene';
export const controllerKey = 'default';

export async function createMapTestScene(controller, ticker) {
    const scene = new PIXI.Container();
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

    // Main map area simulating a mobile landscape view
    const mainMapPanel = new PIXI.Container({
        label: 'MainMapPanel',
        layout: {
            width: 800,
            height: 450,
            backgroundColor: 0x0a1f0a,
            borderRadius: 8
        }
    });

    const panelMask = new PIXI.Graphics()
        .rect(0, 0, 800, 450)
        .fill(0xffffff);

    mainMapPanel.addChild(panelMask);
    mainMapPanel.mask = panelMask;

    const mockApp = { ticker };
    const mainMap = new MapViewArea(mockApp, {
        layout: { width: '100%', height: '100%' }
    });
    mainMap.container.label = 'MainMapRoot';

    mainMapPanel.addChild(mainMap.container);
    // Initialize manual pan for presentation
    mainMap.mapContent.x = 30;
    mainMap.mapContent.y = 30;

    scene.addChild(mainMapPanel);

    return scene;
}
