import * as PIXI from 'pixi.js';
import { MapConstants } from './mapConstants.js';
import { MapUtils } from '../../utils/mapUtils.js';
import { Colors, Font, headerFont, SystemColors } from '../../core/uiStyle.js';
import { applyTintColor, applyGlowEffect } from '../../ui/effects/glowEffect.js';
import { applyFlickerEffect } from '../../ui/effects/flickerEffect.js';
import { flashSelection } from './mapEffects.js';
import { MapHUDRenderer } from './MapHUDRenderer.js';


/**
 * Map Renderer (Feature Layer)
 * Stateless visual construction of the map.
 * Does not handle input or decision logic.
 */
export class MapRenderer {
    constructor(app, assets, config = {}) {
        this.app = app;
        this.assets = assets;
        this.config = {
            gridSize: MapConstants.GRID_SIZE,
            tileSize: MapConstants.DEFAULT_SCALE,
            ...config
        };

        this.viewConfig = {
            showGridLines: true,
            showSectorLines: false, // 3x3 lines
            labelMode: 'COORDINATE', // 'COORDINATE' | 'SECTOR' | 'NONE'
            miniMode: false,
            showHUD: true,
            ...this.config.viewConfig
        };

        this.destroyed = false;


        this.container = new PIXI.Container();
        this.mapContent = new PIXI.Container();

        // --- Scanline hit surface ---
        const scanTex = this.assets.scanlines || PIXI.Texture.WHITE;

        this.hitSurface = new PIXI.TilingSprite({
            texture: scanTex,
            width: 1,
            height: 1
        });

        this.hitSurface.eventMode = 'static';
        this.hitSurface.cursor = 'crosshair';
        this.hitSurface.alpha = 0.08;
        this.hitSurface.interactiveChildren = false;

        this.container.addChild(this.hitSurface);
        this.container.addChild(this.mapContent);

        this.mapGrid = new PIXI.Container();
        this.sectorLayer = new PIXI.Container(); // 3x3 Large blocks
        this.anchorLayer = new PIXI.Container();
        this.trackLayer = new PIXI.Container(); // Track visualization layer
        this.hoverLayer = new PIXI.Container();
        this.decorationGrid = new PIXI.Container();
        this.explosionLayer = new PIXI.Container(); // Final top-most visual layer for FX

        this.mapContent.addChild(
            this.mapGrid,
            this.sectorLayer,
            this.anchorLayer,
            this.trackLayer,
            this.hoverLayer,
            this.decorationGrid,
            this.explosionLayer
        );

        this.hoverGraphic = new PIXI.Graphics();
        this.hoverLayer.addChild(this.hoverGraphic);
        this.hoverGraphic.visible = false;

        this.selectionGraphic = new PIXI.Graphics();
        this.hoverLayer.addChild(this.selectionGraphic);
        this.selectionGraphic.visible = false;

        this.ownshipMarker = new PIXI.Graphics();
        this.hoverLayer.addChild(this.ownshipMarker);
        this.ownshipMarker.visible = false;

        // Persistent map elements
        this.waypointGraphic = new PIXI.Sprite(this.assets.map_select);
        this.waypointGraphic.visible = false;
        this.hoverLayer.addChild(this.waypointGraphic);

        this.torpedoTargetGraphic = new PIXI.Sprite(this.assets.reticule);
        this.torpedoTargetGraphic.visible = false;
        this.hoverLayer.addChild(this.torpedoTargetGraphic);

        this.markGraphics = []; // Array of PIXI.Sprite for marks
        this.trackGraphics = {}; // Object storing track visuals by trackId
        this.explosionPool = []; // Pool for explosion sprites

        this.horizontalLabels = new PIXI.Container();
        this.verticalLabels = new PIXI.Container();
        this.container.addChild(this.horizontalLabels, this.verticalLabels);

        this.mask = new PIXI.Graphics();
        this.container.addChild(this.mask);
        this.mapContent.mask = this.mask;

        this.labelGutter = MapConstants.LABEL_GUTTER;
        this.hLabelMask = new PIXI.Graphics();
        this.vLabelMask = new PIXI.Graphics();
        this.horizontalLabels.mask = this.hLabelMask;
        this.verticalLabels.mask = this.vLabelMask;
        this.container.addChild(this.hLabelMask, this.vLabelMask);

        // HUD Overlay (Modular)
        this.hud = new MapHUDRenderer(this);
        this.hud.visible = false;
        this.container.addChild(this.hud.container);

        this.currentScale = this.config.tileSize;
        this.maskWidth = 0;
        this.maskHeight = 0;

        this.tiles = []; // 2D array for tile references
        this.activeGlows = new Map(); // Store glow objects for cleanup
        this.axisLabels = { h: [], v: [] };
        this.hoverTile = null;

        // Ownship Sprite
        this.ownshipSprite = null;
        this.ownshipPos = { row: 0, col: 0 };
        if (this.assets.ownship) {

            this.ownshipSprite = new PIXI.Sprite(this.assets.ownship);
            this.ownshipSprite.anchor.set(0.5);
            this.ownshipSprite.visible = false;
            this.mapContent.addChild(this.ownshipSprite);
        }

        // Set eventMode for all non-interactive containers 
        this.mapContent.eventMode = 'none';
        this.mapGrid.eventMode = 'none';
        this.decorationGrid.eventMode = 'none';
        this.trackLayer.eventMode = 'none';
        this.hoverLayer.eventMode = 'none';
        this.sectorLayer.eventMode = 'none';
        this.anchorLayer.eventMode = 'none';
        this.hud.container.eventMode = 'none';


        this.renderMap();

        // Label sync
        this._labelTicker = () => {
            if (this.container && !this.container.destroyed && !this.destroyed) {
                this.horizontalLabels.x = this.mapContent.x;
                this.verticalLabels.y = this.mapContent.y;
            }
        };
        this.app.ticker.add(this._labelTicker);
    }

    renderMap() {
        const { gridSize } = this.config;
        const labelStyle = {
            fontFamily: headerFont.family,
            fontSize: 20,
            fill: Colors.text,
            dropShadow: { blur: 2, color: 0x000000, distance: 1 }
        };

        const sectorLabelStyle = {
            ...labelStyle,
            fontSize: 24,
            fill: Colors.text,
            alpha: 0.6
        };

        // 1. Initial Creation or Reuse of Tiles
        const needsTileInit = this.tiles.length === 0;

        if (needsTileInit) {
            this.mapGrid.removeChildren();
            for (let row = 0; row < gridSize; row++) {
                const rowTiles = [];
                for (let col = 0; col < gridSize; col++) {
                    const tile = new PIXI.Graphics();
                    this.mapGrid.addChild(tile);
                    rowTiles.push(tile);
                }
                this.tiles.push(rowTiles);
            }
        }

        // Update tile positions and sizes
        this.mapGrid.visible = this.viewConfig.showGridLines;
        if (this.viewConfig.showGridLines) {
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const tile = this.tiles[row][col];
                    tile.clear()
                        .rect(0, 0, this.currentScale, this.currentScale)
                        .fill({ color: 0x003300, alpha: 0.3 })
                        .stroke({ width: 1, color: 0x005500 });
                    tile.x = col * this.currentScale;
                    tile.y = row * this.currentScale;
                }
            }
        }

        this.renderSectors(sectorLabelStyle);

        // 2. Initial Creation or Reuse of Labels
        const needsLabelInit = this.axisLabels.h.length === 0;
        const showCoordinateLabels = this.viewConfig.labelMode === 'COORDINATE';

        if (needsLabelInit) {
            this.horizontalLabels.removeChildren();
            this.verticalLabels.removeChildren();

            for (let i = 0; i < gridSize; i++) {
                const hText = new PIXI.Text({ text: String.fromCharCode(65 + i), style: labelStyle });
                hText.anchor.set(0.5);
                this.horizontalLabels.addChild(hText);
                this.axisLabels.h.push(hText);

                const vText = new PIXI.Text({ text: (i + 1).toString(), style: labelStyle });
                vText.anchor.set(0.5);
                this.verticalLabels.addChild(vText);
                this.axisLabels.v.push(vText);
            }
        }

        this.horizontalLabels.visible = showCoordinateLabels;
        this.verticalLabels.visible = showCoordinateLabels;

        // Update label positions
        for (let i = 0; i < gridSize; i++) {
            const hText = this.axisLabels.h[i];
            hText.x = i * this.currentScale + this.currentScale / 2;
            hText.y = this.labelGutter / 2;

            const vText = this.axisLabels.v[i];
            vText.x = this.labelGutter / 2;
            vText.y = i * this.currentScale + this.currentScale / 2;
        }

        if (this.ownshipSprite && this.ownshipSprite.visible) {
            this.updateOwnship(this.ownshipPos.row, this.ownshipPos.col);
        }
    }

    renderSectors(labelStyle) {
        const sectorSize = this.currentScale * 5;
        this.sectorLayer.visible = this.viewConfig.showSectorLines;

        if (!this.sectorLayer.visible && this.viewConfig.labelMode !== 'SECTOR') {
            this.sectorLayer.removeChildren();
            return;
        }

        if (this.sectorLayer.children.length === 0) {
            for (let i = 1; i <= 9; i++) {
                const container = new PIXI.Container();
                container.label = `sector_${i}`;

                const frame = new PIXI.Graphics();
                const center = MapUtils.getSectorCenter(i, this.currentScale);

                const text = new PIXI.Text({ text: i.toString(), style: labelStyle });
                text.anchor.set(0.5);
                text.position.set(center.x, center.y);
                text.label = 'sector_label';

                container.addChild(frame, text);
                this.sectorLayer.addChild(container);
            }
        }

        // Update frames and label visibility
        this.sectorLayer.children.forEach((container, idx) => {
            const i = idx + 1;
            const frame = container.children[0];
            const text = container.children[1];
            const bounds = MapUtils.getSectorBounds(i);

            frame.clear();
            if (this.viewConfig.showSectorLines) {
                frame.rect(bounds.minCol * this.currentScale, bounds.minRow * this.currentScale, sectorSize, sectorSize)
                    .stroke({ width: 2, color: 0x00aa00, alpha: 0.5 });
            }

            text.visible = this.viewConfig.labelMode === 'SECTOR';
            const center = MapUtils.getSectorCenter(i, this.currentScale);
            text.position.set(center.x, center.y);
        });
    }


    setViewport(x, y, width, height) {
        this.mask.clear()
            .rect(x + this.labelGutter, y + this.labelGutter, width - this.labelGutter, height - this.labelGutter)
            .fill(0xffffff);

        this.hLabelMask.clear()
            .rect(x + this.labelGutter, y, width - this.labelGutter, this.labelGutter)
            .fill(0xffffff);

        this.vLabelMask.clear()
            .rect(x, y + this.labelGutter, this.labelGutter, height - this.labelGutter)
            .fill(0xffffff);

        this.maskWidth = width - this.labelGutter;
        this.maskHeight = height - this.labelGutter;

        this.mapContent.x = x + this.labelGutter;
        this.mapContent.y = y + this.labelGutter;
        this.horizontalLabels.y = y;
        this.verticalLabels.x = x;

        this.hitSurface.x = x;
        this.hitSurface.y = y;
        this.hitSurface.width = width;
        this.hitSurface.height = height;

        if (this.hud && this.hud.container) {
            this.hud.container.x = x;
        }
    }

    clampPosition() {
        const MAP_WIDTH = this.config.gridSize * this.currentScale;
        const MAP_HEIGHT = this.config.gridSize * this.currentScale;

        const minX = Math.min(this.labelGutter, this.maskWidth + this.labelGutter - MAP_WIDTH);
        const maxX = this.labelGutter;
        const minY = Math.min(this.labelGutter, this.maskHeight + this.labelGutter - MAP_HEIGHT);
        const maxY = this.labelGutter;

        this.mapContent.x = Math.max(minX, Math.min(maxX, this.mapContent.x));
        this.mapContent.y = Math.max(minY, Math.min(maxY, this.mapContent.y));
    }

    // Visual Stack Implementation
    // Visual Stack Implementation
    showHover(row, col, valid = true) {
        const size = this.currentScale;

        this.hoverGraphic.clear();
        this.hoverGraphic
            .rect(0, 0, size, size)
            .stroke({
                width: 2,
                color: valid ? SystemColors.reactor : Colors.dim,
                alpha: 0.9
            });

        this.hoverGraphic.x = col * size;
        this.hoverGraphic.y = row * size;
        this.hoverGraphic.visible = true;

    }

    clearHover() {
        this.hoverGraphic.visible = false;
    }

    highlightSelection(row, col, systemName = 'detection', onComplete = null) {
        this.clearSelection();

        const size = this.currentScale;
        this.selectionGraphic.clear();

        // Get color based on system name
        let highlightColor = 0xFFFFFF; // Default white
        switch (systemName) {
            case 'weapons':
                highlightColor = SystemColors.weapons; // Red for weapons/torpedo
                break;
            case 'reactor':
                highlightColor = SystemColors.reactor; // Grey for marks
                break;
            case 'detection':
            default:
                highlightColor = SystemColors.detection; // Green for waypoints
                break;
        }

        // Colored overlay with reduced alpha
        this.selectionGraphic
            .rect(0, 0, size, size);

        if (this.viewConfig.miniMode) {
            this.selectionGraphic.fill({ color: highlightColor, alpha: 0.6 });
        } else {
            this.selectionGraphic.fill({ color: highlightColor, alpha: 0.25 })
                .stroke({ width: 2, color: highlightColor, alpha: 0.6 });
        }

        this.selectionGraphic.x = col * size;
        this.selectionGraphic.y = row * size;
        this.selectionGraphic.visible = true;

        // Rapid flash effect: ON-OFF-ON sequence
        // We pass the app instance, target, duration (unused by simple ticker but kept for signature), count (toggles), callback
        const cancel = flashSelection(this.app, this.selectionGraphic, 0, 3, onComplete);
        this.activeGlows.set('selection_flash', { off: cancel });
    }

    clearSelection() {
        // Stop flash ticker if active
        const flashEffect = this.activeGlows.get('selection_flash');
        if (flashEffect && flashEffect.off) {
            flashEffect.off();
            this.activeGlows.delete('selection_flash');
        }

        this.selectionGraphic.visible = false;

        const effect = this.activeGlows.get('selection');
        if (effect) {
            effect.off();
            this.activeGlows.delete('selection');
        }
        this.resetAxis();
    }

    /**
     * Highlights an entire sector (1-9). Used for drone/sonar feedback.
     * @param {number} sectorId - Sector ID (1-9)
     * @param {number} tint - Color tint
     */
    highlightSector(sectorId, tint = SystemColors.detection) {
        const bounds = MapUtils.getSectorBounds(sectorId);
        const sectorSize = this.currentScale * 5;

        // Reuse selection graphic or create dedicated feedback graphic?
        // Let's use a dedicated feedback graphic if multiple sectors need to be shown, 
        // but for now, selectionGraphic is fine.
        this.clearSelection();

        this.selectionGraphic.clear()
            .rect(0, 0, sectorSize, sectorSize)
            .fill({ color: tint, alpha: 0.3 })
            .stroke({ width: 3, color: tint, alpha: 0.7 });

        this.selectionGraphic.x = bounds.minCol * this.currentScale;
        this.selectionGraphic.y = bounds.minRow * this.currentScale;
        this.selectionGraphic.visible = true;

        flashSelection(this.app, this.selectionGraphic, 0, 5);
    }

    /**
     * Updates the waypoint graphic position
     * @param {object} coords - {row, col} or null to hide
     */
    updateWaypoint(coords) {
        if (coords) {
            const size = this.currentScale;
            this.waypointGraphic.x = coords.col * size;
            this.waypointGraphic.y = coords.row * size;
            this.waypointGraphic.width = size;
            this.waypointGraphic.height = size;
            this.waypointGraphic.visible = true;
        } else {
            this.waypointGraphic.visible = false;
        }
    }

    /**
     * Clears the waypoint graphic
     */
    clearWaypoint() {
        this.waypointGraphic.visible = false;
    }

    /**
     * Updates the torpedo target graphic position
     * @param {object} coords - {row, col} or null to hide
     */
    updateTorpedoTarget(coords) {
        if (coords) {
            const size = this.currentScale;
            this.torpedoTargetGraphic.x = coords.col * size;
            this.torpedoTargetGraphic.y = coords.row * size;
            this.torpedoTargetGraphic.width = size;
            this.torpedoTargetGraphic.height = size;
            this.torpedoTargetGraphic.visible = true;
        } else {
            this.torpedoTargetGraphic.visible = false;
        }
    }

    /**
     * Clears the torpedo target graphic
     */
    clearTorpedoTarget() {
        this.torpedoTargetGraphic.visible = false;
    }

    /**
     * Updates the marks graphics
     * @param {Array} marks - Array of {row, col} coordinates
     */
    updateMarks(marks) {
        if (!marks) return;

        const poolSize = this.markGraphics.length;
        const targetSize = marks.length;

        // Hide extra sprites
        for (let i = targetSize; i < poolSize; i++) {
            this.markGraphics[i].visible = false;
        }

        // Update/Create sprites
        marks.forEach((markCoords, i) => {
            let markSprite;
            if (i < poolSize) {
                markSprite = this.markGraphics[i];
            } else {
                markSprite = new PIXI.Sprite(this.assets.map_dot);
                this.hoverLayer.addChild(markSprite);
                this.markGraphics.push(markSprite);
            }

            const size = this.currentScale;
            markSprite.x = markCoords.col * size;
            markSprite.y = markCoords.row * size;
            markSprite.width = size;
            markSprite.height = size;
            markSprite.visible = true;
        });
    }

    /**
     * Updates positions of all persistent elements when map scales/zooms
     * Note: Individual element updates (waypoint, targets) are handled by MapController.
     * This renderer-level update focuses on batch-managed elements like tracks.
     */
    updatePersistentElementPositions() {
        // Re-render all tracks with new scale
        Object.keys(this.trackGraphics).forEach(trackId => {
            const track = this.trackGraphics[trackId];
            if (track) {
                // Re-render track with stored positions and options
                this.updateTrack(trackId, track.positions, track.options);
            }
        });
    }

    // --- Animation & FX Helpers ---

    getExplosionSprite(row, col) {
        let sprite = this.explosionPool.find(s => !s.visible);
        if (!sprite) {
            sprite = new PIXI.Sprite(this.assets.map_dot);
            sprite.anchor.set(0.5);
            this.explosionLayer.addChild(sprite);
            this.explosionPool.push(sprite);
        }

        sprite.x = col * this.currentScale + this.currentScale / 2;
        sprite.y = row * this.currentScale + this.currentScale / 2;
        sprite.width = this.currentScale;
        sprite.height = this.currentScale;
        sprite.tint = 0xFF0000; // RED placeholder
        sprite.alpha = 1;
        sprite.visible = true;
        sprite.scale.set(0.5);

        return sprite;
    }

    returnExplosionSprite(sprite) {
        sprite.visible = false;
        sprite.alpha = 0;
    }


    emphasizeAxis(row, col) {
        this.resetAxis();

        this.axisLabels.h.forEach((label, i) => {
            if (i === col) {
                applyTintColor(label, SystemColors.detection);
                applyGlowEffect(label, this.app, SystemColors.detection).steadyOn(0.8);
            } else {
                label.alpha = 0.35;
            }
        });

        this.axisLabels.v.forEach((label, i) => {
            if (i === row) {
                applyTintColor(label, SystemColors.detection);
                applyGlowEffect(label, this.app, SystemColors.detection).steadyOn(0.8);
            } else {
                label.alpha = 0.4;
            }
        });
    }

    resetAxis() {
        this.axisLabels.h.forEach(label => {
            label.alpha = 1;
            label.tint = Colors.text;
            if (label.filters) label.filters = [];
        });
        this.axisLabels.v.forEach(label => {
            label.alpha = 1;
            label.tint = Colors.text;
            if (label.filters) label.filters = [];
        });
    }

    updateHUD(data = {}, anchorPoint = 'bottom') {
        if (this.destroyed) return;
        this.hud.update(data, anchorPoint);
    }

    destroy() {
        this.destroyed = true;
        if (this._labelTicker) this.app.ticker.remove(this._labelTicker);
        if (this.zoomTicker) this.app.ticker.remove(this.zoomTicker);
        if (this.panTicker) this.app.ticker.remove(this.panTicker);
    }


    updateOwnship(row, col, tint = Colors.text, visible = true) {
        if (this.destroyed) return;
        this.ownshipPos = { row, col };

        const size = this.currentScale;

        // 1. High contrast square marker (visible in mini-mode)
        this.ownshipMarker.clear();
        if (this.viewConfig.miniMode) {
            this.ownshipMarker
                .rect(0, 0, size, size)
                .fill({ color: tint, alpha: 0.8 })
                .stroke({ width: 2, color: 0x000000, alpha: 0.5 });
            this.ownshipMarker.x = col * size;
            this.ownshipMarker.y = row * size;
            this.ownshipMarker.visible = visible;
        } else {
            this.ownshipMarker.visible = false;
        }

        // 2. Main Ownship Sprite
        if (!this.ownshipSprite) return;

        this.ownshipSprite.visible = visible;
        this.ownshipSprite.x = col * size + size / 2;
        this.ownshipSprite.y = row * size + size / 2;
        this.ownshipSprite.width = size * 0.8;
        this.ownshipSprite.height = size * 0.8;
        this.ownshipSprite.tint = tint;
    }

    /**
     * Updates a track visualization
     * @param {string} trackId - Unique identifier for the track ('ownship', 'enemy-1', etc.)
     * @param {Array} positions - Array of {row, col} coordinates
     * @param {object} options - { color, maskCurrentPosition, visible }
     */
    updateTrack(trackId, positions, options = {}) {
        const {
            color = 0xFFFFFF,
            maskCurrentPosition = false,
            visible = true
        } = options;

        if (!positions) {
            this.clearTrack(trackId);
            return;
        }

        // Get or Create track persistent storage
        let track = this.trackGraphics[trackId];
        if (!track) {
            const trackContainer = new PIXI.Container();
            const lineGraphics = new PIXI.Graphics();
            trackContainer.addChild(lineGraphics);
            this.trackLayer.addChild(trackContainer);

            track = {
                container: trackContainer,
                lineGraphics,
                nodeSprites: [],
                positions: [],
                options: {}
            };
            this.trackGraphics[trackId] = track;
        }

        // Store current context
        track.positions = [...positions];
        track.options = { ...options };
        track.container.visible = visible;

        if (positions.length === 0) {
            track.lineGraphics.clear();
            track.nodeSprites.forEach(s => s.visible = false);
            return;
        }

        const NODE_SCALE = 0.2; // 1/5 grid square
        const nodeSize = this.currentScale * NODE_SCALE;
        const centerOffset = (this.currentScale - nodeSize) / 2;

        const LINE_WIDTH_RATIO = 0.1;
        const lineWidth = this.currentScale * LINE_WIDTH_RATIO;

        // Determine which positions to render based on masking
        let renderPositions = positions;
        if (maskCurrentPosition && positions.length > 0) {
            renderPositions = positions.slice(0, -1);
        }

        // 1. Draw connecting lines
        track.lineGraphics.clear();
        if (renderPositions.length > 1) {
            track.lineGraphics.moveTo(
                renderPositions[0].col * this.currentScale + this.currentScale / 2,
                renderPositions[0].row * this.currentScale + this.currentScale / 2
            );

            for (let i = 1; i < renderPositions.length; i++) {
                const pos = renderPositions[i];
                track.lineGraphics.lineTo(
                    pos.col * this.currentScale + this.currentScale / 2,
                    pos.row * this.currentScale + this.currentScale / 2
                );
            }

            track.lineGraphics.stroke({
                width: lineWidth,
                color: color,
                alpha: 0.8
            });
        }

        // 2. Update node sprites pool
        const poolSize = track.nodeSprites.length;
        const targetSize = renderPositions.length;

        // Hide extra sprites
        for (let i = targetSize; i < poolSize; i++) {
            track.nodeSprites[i].visible = false;
        }

        // Update/Create sprites
        renderPositions.forEach((pos, i) => {
            let nodeSprite;
            if (i < poolSize) {
                nodeSprite = track.nodeSprites[i];
            } else {
                nodeSprite = new PIXI.Sprite(this.assets.map_dot);
                track.container.addChild(nodeSprite);
                track.nodeSprites.push(nodeSprite);
            }

            nodeSprite.x = pos.col * this.currentScale + centerOffset;
            nodeSprite.y = pos.row * this.currentScale + centerOffset;
            nodeSprite.width = nodeSize;
            nodeSprite.height = nodeSize;
            nodeSprite.tint = color;
            nodeSprite.visible = true;
        });
    }

    /**
     * Sets the visibility of the entire track layer
     * @param {boolean} visible - Whether the track layer should be visible
     */
    setTrackLayerVisibility(visible) {
        this.trackLayer.visible = visible;
    }

    /**
     * Clears a specific track
     * @param {string} trackId - Track identifier to clear
     */
    clearTrack(trackId) {
        const track = this.trackGraphics[trackId];
        if (track) {
            this.trackLayer.removeChild(track.container);
            track.container.destroy({ children: true });
            delete this.trackGraphics[trackId];
        }
    }

    /**
     * Clears all tracks
     */
    clearAllTracks() {
        Object.keys(this.trackGraphics).forEach(trackId => {
            this.clearTrack(trackId);
        });
        this.trackGraphics = {};
    }


}

