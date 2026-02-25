import { Container, RenderLayer, Sprite } from 'pixi.js';
import { MapConstants, MapStates, MapIntents } from '../mapConstants.js';
import { MapGrid } from './MapGrid.js';
import { MapLabels } from './MapLabels.js';
import { MapBehaviors } from '../behaviors/MapBehaviors.js';
import { MapUtils } from '../mapUtils.js';

export class MapViewArea {
    constructor(ticker, config = {}) {

        this.ticker = ticker;

        // Map State 
        this.currentState = MapStates.SELECTING;

        // Root component, uses Pixi Layout for flex sizing
        this.viewBox = new Container({
            label: 'MapViewBox',
            layout: {
                ...config.layout
            }
        });

        this.config = {
            gridSize: MapConstants.GRID_SIZE,
            tileSize: MapConstants.DEFAULT_SCALE,
            rowLabelsRight: false,
            ...config,
            labelGutter: MapConstants.LABEL_GUTTER,
        };

        // Area where main map visual content will pan/zoom
        this.mapContent = new Container();
        this.mapContent.label = 'MapContent';
        this.mapContent.eventMode = 'passive';

        // Layers for z-index sorting
        this.layers = {
            background: new RenderLayer(),
            grid: new RenderLayer(),
            tracks: new RenderLayer(),
            labels: new RenderLayer(),
            overlay: new RenderLayer()
        };

        this.layers.background.label = 'BackgroundLayer';
        this.layers.grid.label = 'GridLayer';
        this.layers.tracks.label = 'TracksLayer';
        this.layers.labels.label = 'LabelsLayer';
        this.layers.overlay.label = 'OverlayLayer';

        this.viewBox.addChild(
            this.layers.background,
            this.layers.grid,
            this.layers.tracks,
            this.layers.labels,
            this.layers.overlay
        );

        this.viewBox.addChild(this.mapContent);

        // Components
        this.mapGrid = new MapGrid(this.config);
        this.mapContent.addChild(this.mapGrid.container);
        this.layers.grid.attach(this.mapGrid.container);

        this.mapLabels = new MapLabels(this.config);

        // Add map labels directly to the root viewBox so they don't get clipped by Layer bounds
        // They are already added after mapContent, so they will naturally render on top
        this.viewBox.addChild(this.mapLabels.container);
        this.layers.labels.attach(this.mapLabels.container);

        // Initialize position
        this.mapContent.x = this.config.labelGutter;
        this.mapContent.y = this.config.labelGutter;
        this.mapLabels.syncPosition(this.mapContent.x, this.mapContent.y);

        // Attach interactive behaviors
        this.behaviors = new MapBehaviors(this);

        this.ownShip = null;
        this._moveTicker = null;

        // Map padding/resizing hook
        if (this.viewBox.layout) {
            this.viewBox.on('layout', () => this.handleLayout());
        }
    }

    /**
     * Sets ownShip position with smooth animation and optional map centering.
     * @param {number} row 
     * @param {number} col 
     * @param {boolean} animate 
     * @param {boolean} center 
     */
    setOwnShipPosition(row, col, animate = true, center = true) {
        const { tileSize } = this.config;

        // Target coordinates in map space (centered in tile)
        const targetMarkerX = col * tileSize + tileSize / 2;
        const targetMarkerY = row * tileSize + tileSize / 2;

        if (!this.ownShip) {
            this.ownShip = Sprite.from('ownship');
            this.ownShip.label = 'OwnShip';
            this.ownShip.anchor.set(0.5);
            this.ownShip.scale.set(0.35);
            this.mapContent.addChild(this.ownShip);
            this.layers.tracks.attach(this.ownShip);

            this.ownShip.x = targetMarkerX;
            this.ownShip.y = targetMarkerY;
            this.ownShip.visible = true;

            if (center) this.centerOn(row, col, false);
            return;
        }

        if (!animate) {
            this.ownShip.x = targetMarkerX;
            this.ownShip.y = targetMarkerY;
            if (center) this.centerOn(row, col, false);
            return;
        }

        // Lock interactions during animation
        this.setState(MapStates.ANIMATING);

        if (this._moveTicker) {
            this.ticker.remove(this._moveTicker);
        }

        const startMarkerX = this.ownShip.x;
        const startMarkerY = this.ownShip.y;
        const startMapX = this.mapContent.x;
        const startMapY = this.mapContent.y;

        const { width, height } = this.getLayoutDimensions();
        const targetMapX = center ? (width / 2 - targetMarkerX) : startMapX;
        const targetMapY = center ? (height / 2 - targetMarkerY) : startMapY;

        let elapsed = 0;
        const duration = 500; // ms

        this._moveTicker = (ticker) => {
            elapsed += ticker.deltaTime * (1000 / 60);
            const t = Math.min(1, elapsed / duration);
            const ease = t * (2 - t); // Ease out quad

            this.ownShip.x = startMarkerX + (targetMarkerX - startMarkerX) * ease;
            this.ownShip.y = startMarkerY + (targetMarkerY - startMarkerY) * ease;

            if (center) {
                this.mapContent.x = startMapX + (targetMapX - startMapX) * ease;
                this.mapContent.y = startMapY + (targetMapY - startMapY) * ease;
                this.handleLayout();
            }

            if (t >= 1) {
                this.ticker.remove(this._moveTicker);
                this._moveTicker = null;
                this.setState(MapStates.SELECTING);
            }
        };

        this.ticker.add(this._moveTicker);
    }

    /**
     * Centers the map view on a grid coordinate.
     */
    centerOn(row, col, animate = true) {
        const { tileSize } = this.config;
        const { width, height } = this.getLayoutDimensions();

        if (width === 0 || height === 0) return;

        const targetMapX = width / 2 - (col * tileSize + tileSize / 2);
        const targetMapY = height / 2 - (row * tileSize + tileSize / 2);

        if (!animate) {
            this.mapContent.x = targetMapX;
            this.mapContent.y = targetMapY;
            this.handleLayout();
            return;
        }

        // Reuse ticker logic for standalone centering if needed
        // (Currently setOwnShipPosition handles the main use case)
    }

    /**
     * Set which side the row labels (A-O) are displayed on.
     * @param {boolean} isRight 
     */
    setRowLabelsSide(isRight) {
        this.config.rowLabelsRight = isRight;
        this.mapLabels.updateConfig({ rowLabelsRight: isRight });
        this.handleLayout(); // Trigger re-clamping and sync
    }

    handleLayout() {
        const computed = MapUtils.getLayout(this.viewBox, 'computed');
        if (!computed || computed.width === 0 || computed.height === 0) return;

        this.dimensions = {
            width: computed.width,
            height: computed.height
        };

        // Enforce 90x90 and redraw components to ensure squares aren't scaled or stretched.
        // Future scaling/zoom logic will hook into this configuration.
        this.updateConfig({ tileSize: MapConstants.DEFAULT_SCALE });

        // CRITICAL: Reset scale to 1 to maintain 1:1 pixel grid squares.
        // This prevents the Pixi Layout engine from applying non-square stretching.
        this.viewBox.scale.set(1);

        this.clampPosition();

        // Keep labels synced with map translations
        this.mapLabels.syncPosition(
            this.mapContent.x,
            this.mapContent.y,
            this.dimensions.width,
            this.dimensions.height
        );
    }

    clampPosition() {
        const { width, height } = this.getLayoutDimensions();

        if (width === 0 || height === 0) return;

        const { gridSize, tileSize, labelGutter, rowLabelsRight } = this.config;
        const mapWidth = gridSize * tileSize;
        const mapHeight = gridSize * tileSize;

        // X-Clamping: 
        // If labels are on right, grid can go from 0 to (width - mapWidth)
        // If labels are on left, grid can go from gutter to (width - mapWidth)
        const maxX = rowLabelsRight ? 0 : labelGutter;
        const minX = Math.min(maxX, width - mapWidth - (rowLabelsRight ? labelGutter : 0));

        // Y-Clamping:
        // Top labels always exist, so grid starts at gutter
        const maxY = labelGutter;
        const minY = Math.min(maxY, height - mapHeight);

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
        this.viewBox.emit('map:stateChanged', {
            state: this.currentState,
            intent: this.currentIntent,
            oldState
        });
    }

    setIntent(newIntent) {
        this.currentIntent = newIntent;
        this.viewBox.emit('map:intentChanged', {
            intent: this.currentIntent
        });
    }

    getLayoutDimensions() {
        return this.dimensions || MapUtils.getLayout(this.viewBox, 'computedPixi') || { width: 0, height: 0, x: 0, y: 0 };
    }

    destroy() {
        if (this.behaviors) this.behaviors.destroy();
        this.mapGrid.destroy();
        this.mapLabels.destroy();
        this.viewBox.destroy({ children: true });
    }
}
