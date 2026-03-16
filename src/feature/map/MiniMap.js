import { Container, Graphics } from 'pixi.js';
import { MapViewArea } from './components/MapViewArea.js';
import { MapConstants } from './mapConstants.js';
import { MapUtils } from './mapUtils.js';

export class MiniMap {
    constructor(ticker, layoutConfig = {}) {
        // Create root container for MiniMap with a coordinate isolation
        this.container = new Container({
            label: 'MiniMapPanel',
            isRenderGroup: true,
            layout: {
                ...layoutConfig,
                padding: 5
            }
        });

        // Initialize MapViewArea with Mini Map specifics
        this.mapView = new MapViewArea(ticker, {
            tileSize: MapConstants.MINI_MAP_SCALE,
            labelMode: 'NONE',
            showSectorLines: true,
            labelGutter: 0,
            layout: {
                width: '100%',
                height: '100%',
            }
        });

        const vb = this.mapView.viewBox;
        this.container.addChild(vb);
        vb.cursor = 'crosshair';
    }

    destroy() {
        this.mapView.destroy();
        this.container.destroy({ children: true });
    }
}
