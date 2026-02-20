import { MapViewArea } from './MapViewArea.js';
import { MapConstants } from '../mapConstants.js';

export class MiniMap {
    constructor(app, layoutConfig = {}) {
        this.mapView = new MapViewArea(app, {
            tileSize: (MapConstants.DEFAULT_SCALE || 90) / 2, // 50% scale
            labelMode: 'NONE', // No labels in mini mode
            showSectorLines: true,
            labelGutter: 0,
            layout: layoutConfig
        });

        this.container = this.mapView.container;
        this.container.label = 'MiniMap';
    }

    destroy() {
        this.mapView.destroy();
    }
}
