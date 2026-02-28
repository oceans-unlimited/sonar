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
        console.log('MapView: ', this.mapView);
        console.log('Gutter: ', vb.labelGutter);

        // Create the mask graphics
        const mapMask = new Graphics();
        mapMask.label = 'MiniMapMask';

        // Set initial mask size (if width/height is given statically, otherwise 0 until layout fired)
        const initialWidth = layoutConfig.width || 0;
        const initialHeight = layoutConfig.height || 0;
        mapMask.rect(0, 0, initialWidth, initialHeight);
        mapMask.fill({ color: 0xff0000 });

        this.container.addChild(vb);
        this.container.addChild(mapMask);
        this.container.mask = mapMask;

        // Listen for layout changes to dynamically adjust the layout clipping mask
        vb.on('layout', () => {
            const computedLayout = MapUtils.getLayout(vb, 'computed');
            mapMask.clear();
            mapMask.rect(computedLayout.left, computedLayout.top, computedLayout.width, computedLayout.height);
            mapMask.fill({ color: 0xff0000 });
        });
    }

    destroy() {
        this.mapView.destroy();
        this.container.destroy({ children: true });
    }
}
