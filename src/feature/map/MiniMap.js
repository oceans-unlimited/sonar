import { Container, Graphics } from 'pixi.js';
import { MapViewArea } from './components/MapViewArea.js';
import { MapConstants } from './mapConstants.js';
import { MapUtils } from './mapUtils.js';
import { MapController } from './mapController.js';


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

        // --- EMBEDDED CONTROLLER ---
        // Every map panel owns its own controller instance for UI logic
        this.controller = new MapController();
        this.controller.bindView(this.container); 
        // Note: we bind to the container so the controller can access this.container.mapView
        this.container.mapView = this.mapView;
    }

    destroy() {
        if (this.controller) {
            this.controller.destroy();
        }
        this.mapView.destroy();
        this.container.destroy({ children: true });
    }
}

