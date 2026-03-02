import { Container, RenderLayer, Graphics, Sprite } from 'pixi.js';
import { MapConstants, MapStates, MapIntents } from '../mapConstants.js';
import { MapGrid } from './MapGrid.js';
import { MapLabels } from './MapLabels.js';
import { MapOverlays } from './MapOverlays.js';
import { MapBehaviors } from '../behaviors/MapBehaviors.js';
import { MapUtils } from '../mapUtils.js';
import { LayoutContainer } from '@pixi/layout/components';

/**
 * MapViewArea
 * Structural orchestrator for the map component.
 * Manages layers, components, and transitions.
 */
export class MapViewArea {
    constructor(ticker, config = {}) {
        this.ticker = ticker;
        this.currentState = MapStates.SELECT_SQUARE;
        this.currentIntent = null;

        // Root container with layout flex sizing
        this.viewBox = new LayoutContainer({
            label: 'MapViewBox',
            layout: { ...config.layout }
        });

        this.config = {
            gridSize: MapConstants.GRID_SIZE,
            tileSize: MapConstants.DEFAULT_SCALE,
            rowLabelsRight: false,
            labelGutter: MapConstants.LABEL_GUTTER,
            ...config
        };

        // Panning/Zooming container
        this.mapContent = new Container();
        this.mapContent.label = 'MapContent';
        this.mapContent.eventMode = 'passive';

        // Organizational Layers
        this.layers = {
            background: new RenderLayer(),
            grid: new RenderLayer(),
            tracks: new RenderLayer(),
            labels: new RenderLayer(),
            overlay: new RenderLayer()
        };

        Object.entries(this.layers).forEach(([key, layer]) => {
            layer.label = `${key.charAt(0).toUpperCase() + key.slice(1)}Layer`;
            this.viewBox.addChild(layer);
        });

        this.viewBox.addChild(this.mapContent);

        // Core Components
        this.mapGrid = new MapGrid(this.config);
        this.mapContent.addChild(this.mapGrid.container);
        this.layers.grid.attach(this.mapGrid.container);

        this.mapLabels = new MapLabels(this.config);
        this.viewBox.addChild(this.mapLabels.container);
        this.layers.labels.attach(this.mapLabels.container);

        // Modular Overlays
        this.overlays = new MapOverlays(this.mapContent, this.layers, this.config);

        // Sync highlights between grid and labels
        this.overlays.onHighlight = (type, data) => {
            if (type === 'square') {
                this.mapLabels.setOverlay('row', data.row, data.color, data.alpha);
                this.mapLabels.setOverlay('col', data.col, data.color, data.alpha);
            } else if (type === 'row' || type === 'col') {
                const index = type === 'row' ? data.row : data.col;
                this.mapLabels.setOverlay(type, index, data.color, data.alpha);
            }
        };
        this.overlays.onClear = () => this.mapLabels.clearAllOverlays();

        // Positioning
        this.mapContent.x = this.config.labelGutter;
        this.mapContent.y = this.config.labelGutter;
        this.mapLabels.syncPosition(this.mapContent.x, this.mapContent.y);

        // Behaviors
        this.behaviors = new MapBehaviors(this);

        this.ownShip = null;
        this._moveTicker = null;

        if (this.viewBox.layout) {
            this.viewBox.on('layout', () => this.handleLayout());
        }
    }

    // --- State & Intent Management ---

    setState(newState, intent = null) {
        const oldState = this.currentState;
        this.currentState = newState;
        if (intent) this.currentIntent = intent;

        this.viewBox.emit('map:stateChanged', {
            state: this.currentState,
            intent: this.currentIntent,
            oldState
        });
    }

    setIntent(newIntent) {
        this.currentIntent = newIntent;

        const stateMap = {
            [MapIntents.ROW_SELECT]: MapStates.SELECT_ROW,
            [MapIntents.COLUMN_SELECT]: MapStates.SELECT_COLUMN,
            [MapIntents.SECTOR_SELECT]: MapStates.SELECT_SECTOR
        };

        this.setState(stateMap[newIntent] || MapStates.SELECT_SQUARE);
        this.viewBox.emit('map:intentChanged', { intent: this.currentIntent });
    }

    // --- Viewport & Layout ---

    handleLayout() {
        const computed = MapUtils.getLayout(this.viewBox, 'computed');
        if (!computed || computed.width === 0 || computed.height === 0) return;

        this.dimensions = { width: computed.width, height: computed.height };
        this.viewBox.scale.set(1);
        this.clampPosition();

        this.mapLabels.syncPosition(
            this.mapContent.x,
            this.mapContent.y,
            this.dimensions.width,
            this.dimensions.height
        );

        this.overlays.render();
    }

    clampPosition() {
        const { width, height } = this.getLayoutDimensions();
        if (width === 0 || height === 0) return;

        const { gridSize, tileSize, labelGutter, rowLabelsRight } = this.config;
        const mapSize = gridSize * tileSize;

        const maxX = rowLabelsRight ? 0 : labelGutter;
        const minX = Math.min(maxX, width - mapSize - (rowLabelsRight ? labelGutter : 0));
        const maxY = labelGutter;
        const minY = Math.min(maxY, height - mapSize);

        this.mapContent.x = Math.max(minX, Math.min(maxX, this.mapContent.x));
        this.mapContent.y = Math.max(minY, Math.min(maxY, this.mapContent.y));
    }

    getLayoutDimensions() {
        return this.dimensions || { width: 0, height: 0 };
    }

    // --- Components API ---

    setRowLabelsSide(isRight) {
        this.config.rowLabelsRight = isRight;
        this.mapLabels.updateConfig({ rowLabelsRight: isRight });
        this.handleLayout();
    }

    setOwnShipPosition(row, col, animate = true, center = true) {
        const { tileSize } = this.config;
        const targetX = col * tileSize + tileSize / 2;
        const targetY = row * tileSize + tileSize / 2;

        if (!this.ownShip) {
            this.ownShip = Sprite.from('ownship');
            this.ownShip.anchor.set(0.5);
            this.ownShip.scale.set(0.35);
            this.mapContent.addChild(this.ownShip);
            this.layers.tracks.attach(this.ownShip);
            this.ownShip.x = targetX;
            this.ownShip.y = targetY;
            if (center) this.centerOn(row, col, false);
            return;
        }

        if (!animate) {
            this.ownShip.x = targetX;
            this.ownShip.y = targetY;
            if (center) this.centerOn(row, col, false);
            return;
        }

        this.animatePosition(targetX, targetY, center, row, col);
    }

    animatePosition(targetMarkerX, targetMarkerY, center, targetRow, targetCol) {
        this.setState(MapStates.ANIMATING);
        if (this._moveTicker) this.ticker.remove(this._moveTicker);

        const startMarkerX = this.ownShip.x;
        const startMarkerY = this.ownShip.y;
        const startMapX = this.mapContent.x;
        const startMapY = this.mapContent.y;

        const { width, height } = this.getLayoutDimensions();
        const targetMapX = center ? (width / 2 - targetMarkerX) : startMapX;
        const targetMapY = center ? (height / 2 - targetMarkerY) : startMapY;

        let elapsed = 0;
        const duration = 500;

        this._moveTicker = (ticker) => {
            elapsed += ticker.deltaTime * (1000 / 60);
            const t = Math.min(1, elapsed / duration);
            const ease = t * (2 - t);

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
                this.setState(MapStates.SELECT_SQUARE);
            }
        };
        this.ticker.add(this._moveTicker);
    }

    centerOn(row, col, animate = true) {
        const { tileSize } = this.config;
        const { width, height } = this.getLayoutDimensions();
        const targetMapX = width / 2 - (col * tileSize + tileSize / 2);
        const targetMapY = height / 2 - (row * tileSize + tileSize / 2);

        if (!animate) {
            this.mapContent.x = targetMapX;
            this.mapContent.y = targetMapY;
            this.handleLayout();
            return;
        }

        // Animated Centering (matching smoothed marker movement)
        this.setState(MapStates.ANIMATING);
        if (this._moveTicker) this.ticker.remove(this._moveTicker);

        const startMapX = this.mapContent.x;
        const startMapY = this.mapContent.y;

        let elapsed = 0;
        const duration = 500;

        this._moveTicker = (ticker) => {
            elapsed += ticker.deltaTime * (1000 / 60);
            const t = Math.min(1, elapsed / duration);
            const ease = t * (2 - t); // Ease out quad

            this.mapContent.x = startMapX + (targetMapX - startMapX) * ease;
            this.mapContent.y = startMapY + (targetMapY - startMapY) * ease;
            this.handleLayout();

            if (t >= 1) {
                this.ticker.remove(this._moveTicker);
                this._moveTicker = null;
                this.setState(MapStates.SELECT_SQUARE);
            }
        };
        this.ticker.add(this._moveTicker);
    }

    // --- Layer Controls ---

    setOpponentVisible(v) { console.log(`[MapViewArea] Opponent visible: ${v}`); }
    setPastTrackVisible(v) { this.layers.tracks.visible = v; }
    setMinesVisible(v) { console.log(`[MapViewArea] Mines visible: ${v}`); }
    setTerrainVisible(v) { this.layers.background.visible = v; }

    destroy() {
        if (this.behaviors) this.behaviors.destroy();
        this.mapGrid.destroy();
        this.mapLabels.destroy();
        this.viewBox.destroy({ children: true });
    }
}
