import { Container, Graphics } from 'pixi.js';
import { MapViewArea } from './components/MapViewArea.js';
import { MapUtils } from './mapUtils.js';

/**
 * Creates a self-contained map panel with a view area and masking.
 * @param {Ticker} ticker - The Ticker instance for animations.
 * @param {number} width - The width of the map panel.
 * @param {number} height - The height of the map panel.
 * @param {object} panelLayoutConfig - Layout properties for the main panel container.
 * @returns {Container} The configured map panel container.
 */
export function createMapPanel(ticker, width, height, panelLayoutConfig = {}) {
    // 1. Create the root container for the map feature.
    // Setting isRenderGroup: true isolates the coordinate system (origin 0,0).
    const mapPanel = new Container({
        label: 'MapPanel',
        isRenderGroup: true,
        layout: {
            ...panelLayoutConfig,
            width,
            height,
            padding: 10
        }
    });

    // 2. Create the MapViewArea.
    const mapViewArea = new MapViewArea(ticker, {
        layout: {
            width: '100%',
            height: '100%',
        }
    });
    const vb = mapViewArea.viewBox;

    // 3. Create a mask for the map view area.
    const mapMask = new Graphics();
    mapMask.label = 'MapViewMask';
    mapMask.rect(0, 0, width, height);
    mapMask.fill({ color: 0xff0000 })

    mapPanel.addChild(vb);
    mapPanel.addChild(mapMask);
    mapPanel.mask = mapMask;

    // Add a convenience reference to the mapViewArea on the panel if needed
    mapPanel.mapView = mapViewArea;

    vb.on('layout', (event) => {
        const computedLayout = MapUtils.getLayout(vb, 'computed');
        console.log('[mapRenderer] mapPanel layout synced:', computedLayout);
        mapMask.clear();
        mapMask.rect(computedLayout.left, computedLayout.top, computedLayout.width, computedLayout.height);
        mapMask.fill({ color: 0xff0000 })
    });

    return mapPanel;
}


