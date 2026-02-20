import * as PIXI from 'pixi.js';
import { MapConstants, MapStates, MapIntents } from '../mapConstants.js';
import { MapGrid } from './MapGrid.js';
import { MapLabels } from '../render/MapLabels.js';
import { MapBehaviors } from './MapBehaviors.js';

export class MapViewArea {
    constructor(app, config = {}) {
        this.app = app;

        // Map State 
        this.currentState = MapStates.SELECTING;
        this.currentIntent = MapIntents.WAYPOINT;

        // Root component, uses Pixi Layout for flex sizing
        this.container = new PIXI.Container({
            isRenderGroup: true,
            layout: {
                width: '100%',
                height: '100%',
                ...config.layout
            }
        });

        this.config = {
            gridSize: MapConstants.GRID_SIZE,
            tileSize: MapConstants.DEFAULT_SCALE,
            labelGutter: MapConstants.LABEL_GUTTER,
            ...config
        };

        // Area where main map visual content will pan/zoom
        this.mapContent = new PIXI.Container();
        this.mapContent.label = 'MapContent';
        this.mapContent.eventMode = 'passive';

        // Layers for z-index sorting
        this.layers = {
            background: new PIXI.RenderLayer(),
            grid: new PIXI.RenderLayer(),
            tracks: new PIXI.RenderLayer(),
            labels: new PIXI.RenderLayer(),
            overlay: new PIXI.RenderLayer()
        };

        this.layers.background.label = 'BackgroundLayer';
        this.layers.grid.label = 'GridLayer';
        this.layers.tracks.label = 'TracksLayer';
        this.layers.labels.label = 'LabelsLayer';
        this.layers.overlay.label = 'OverlayLayer';

        this.container.addChild(
            this.layers.background,
            this.layers.grid,
            this.layers.tracks,
            this.layers.labels,
            this.layers.overlay
        );

        this.container.addChild(this.mapContent);

        // Components
        this.mapGrid = new MapGrid(this.config);
        this.mapContent.addChild(this.mapGrid.container);
        this.layers.grid.attach(this.mapGrid.container);

        this.mapLabels = new MapLabels(this.config);

        // Add map labels directly to the root container so they don't get clipped by Layer bounds
        // They are already added after mapContent, so they will naturally render on top
        this.container.addChild(this.mapLabels.container);

        // Initialize position
        this.mapContent.x = this.config.labelGutter || 0;
        this.mapContent.y = this.config.labelGutter || 0;
        this.mapLabels.syncPosition(this.mapContent.x, this.mapContent.y);

        // Attach interactive behaviors
        this.behaviors = new MapBehaviors(this);

        // Map padding/resizing hook
        if (this.container.layout) {
            this.container.onRender = () => this.handleLayout();
        }
    }

    handleLayout() {
        if (!this.container.layout) return;

        const width = this.container.layout.realWidth || 0;
        const height = this.container.layout.realHeight || 0;

        if (width === 0 || height === 0) return;

        const gutter = this.config.labelGutter || 0;

        this.clampPosition();

        // Keep labels synced with map translations
        // The x/y of the horizontal/vertical labels handles panning
        this.mapLabels.syncPosition(this.mapContent.x, this.mapContent.y);

        // Gutter area remains fixed visually (already handled by mask and absolute gutter coords)
    }

    clampPosition() {
        if (!this.container.layout) return;

        const width = this.container.layout.realWidth || 0;
        const height = this.container.layout.realHeight || 0;
        if (width === 0 || height === 0) return;

        const { gridSize, tileSize, labelGutter } = this.config;
        const mapWidth = gridSize * tileSize;
        const mapHeight = gridSize * tileSize;

        // The minimum x/y coordinate allows the map's bottom/right edge to reach the view's bottom/right edge
        // The maximum x/y coordinate restricts the map's top/left edge from moving inwards past the gutter
        const minX = Math.min(labelGutter, width - mapWidth);
        const maxX = labelGutter;
        const minY = Math.min(labelGutter, height - mapHeight);
        const maxY = labelGutter;

        this.mapContent.x = Math.max(minX, Math.min(maxX, this.mapContent.x));
        this.mapContent.y = Math.max(minY, Math.min(maxY, this.mapContent.y));
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.mapGrid.updateConfig(this.config);
        this.mapLabels.updateConfig(this.config);
    }

    setState(newState, intent = null) {
        const oldState = this.currentState;
        this.currentState = newState;

        if (intent && newState === MapStates.SELECTING) {
            this.currentIntent = intent;
        }

        // Fire an event if anyone wants to listen (like a UI controller)
        this.container.emit('map:stateChanged', {
            state: this.currentState,
            intent: this.currentIntent,
            oldState
        });
    }

    setIntent(newIntent) {
        this.currentIntent = newIntent;
        this.container.emit('map:intentChanged', {
            intent: this.currentIntent
        });
    }

    destroy() {
        if (this.behaviors) this.behaviors.destroy();
        this.mapGrid.destroy();
        this.mapLabels.destroy();
        this.container.destroy({ children: true });
    }
}
