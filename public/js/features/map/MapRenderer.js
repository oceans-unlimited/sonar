import * as PIXI from 'pixi.js';
import { MapConstants } from './mapConstants.js';
import { MapUtils } from '../../utils/mapUtils.js';
import { Colors, Font, headerFont, SystemColors } from '../../core/uiStyle.js';
import { applyTintColor, applyGlowEffect } from '../../ui/effects/glowEffect.js';
import { applyFlickerEffect } from '../../ui/effects/flickerEffect.js';


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
        this.anchorLayer = new PIXI.Container();
        this.hoverLayer = new PIXI.Container();
        this.decorationGrid = new PIXI.Container();

        this.mapContent.addChild(this.mapGrid, this.anchorLayer, this.hoverLayer, this.decorationGrid);

        this.hoverGraphic = new PIXI.Graphics();
        this.hoverLayer.addChild(this.hoverGraphic);
        this.hoverGraphic.visible = false;

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

        // HUD Overlay
        this.hud = new PIXI.Container();
        this.hud.visible = false;
        this.container.addChild(this.hud);

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
        this.hoverLayer.eventMode = 'none';
        this.anchorLayer.eventMode = 'none';
        this.hud.eventMode = 'none';


        this.renderMap();
        this.renderHUD();

        // Label sync
        this.app.ticker.add(() => {
            if (this.container && !this.container.destroyed) {
                this.horizontalLabels.x = this.mapContent.x;
                this.verticalLabels.y = this.mapContent.y;

                // Keep labels "centered" on their row/col, but visual scale fixed.
                // We achieve this by scaling the container inverse to currentScale?
                // Or just setting positions. Since they are children of horizontalLabels/verticalLabels
                // and those are children of container (not mapContent), they are NOT scaled by zoom?
                // Wait, mapContent (grid) scales? No, renderMap redraws rects at new `currentScale`.
                // So the labels also need to be re-positioned.

                // If the user zooms, `renderMap` is called with new scale.
                // So we don't need to update positions in ticker, ONLY offset.
                // However, we want labels to NOT scale. 
                // The `renderMap` implementation sets fontSize based on scale. We need to Init with fixed size.
            }
        });
    }

    renderMap() {
        this.mapGrid.removeChildren();
        this.decorationGrid.removeChildren();
        this.horizontalLabels.removeChildren();
        this.verticalLabels.removeChildren();

        const { gridSize } = this.config;
        this.tiles = [];

        for (let row = 0; row < gridSize; row++) {
            const rowTiles = [];
            for (let col = 0; col < gridSize; col++) {
                const tile = new PIXI.Graphics()
                    .rect(0, 0, this.currentScale, this.currentScale)
                    .fill({ color: 0x003300, alpha: 0.3 })
                    .stroke({ width: 1, color: 0x005500 });
                tile.x = col * this.currentScale;
                tile.y = row * this.currentScale;
                this.mapGrid.addChild(tile);
                rowTiles.push(tile);
            }
            this.tiles.push(rowTiles);
        }

        const labelStyle = {
            fontFamily: headerFont.family,
            fontSize: 16, // Fixed size
            fill: Colors.text,
            dropShadow: { blur: 2, color: 0x000000, distance: 1 }
        };

        this.axisLabels.h = [];
        this.axisLabels.v = [];

        for (let i = 0; i < gridSize; i++) {
            const hText = new PIXI.Text({ text: String.fromCharCode(65 + i), style: labelStyle });
            hText.anchor.set(0.5);
            // Center in the column
            hText.x = i * this.currentScale + this.currentScale / 2;
            hText.y = this.labelGutter / 2;
            this.horizontalLabels.addChild(hText);
            this.axisLabels.h.push(hText);

            const vText = new PIXI.Text({ text: (i + 1).toString(), style: labelStyle });
            vText.anchor.set(0.5);
            vText.x = this.labelGutter / 2;
            vText.y = i * this.currentScale + this.currentScale / 2;
            this.verticalLabels.addChild(vText);
            this.axisLabels.v.push(vText);
        }

        if (this.ownshipSprite && this.ownshipSprite.visible) {
            this.updateOwnship(this.ownshipPos.row, this.ownshipPos.col);
        }
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

    highlightSelection(row, col, systemName = 'detection') {
        this.clearSelection();
        const tile = this.tiles[row][col];
        const effect = applyGlowEffect(tile, this.app, systemName);
        effect.pulse();
        // Settle into steady glow after brief pulse by instruction implicitly handled by logic or explicit timeout
        setTimeout(() => effect.steadyOn(1.8), 1000);
        this.activeGlows.set('selection', effect);
    }

    clearSelection() {
        const effect = this.activeGlows.get('selection');
        if (effect) {
            effect.off();
            this.activeGlows.delete('selection');
        }
        this.resetAxis();
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

    renderHUD() {
        this.hud.removeChildren();

        const style = { fontFamily: Font.family, fontSize: 16 };
        const ownshipStyle = { ...style, fill: Colors.text, fontWeight: 'bold' };
        const selectionStyle = { ...style, fill: Colors.danger, fontWeight: 'bold' };

        // Left side: Ownship
        const ownshipGroup = new PIXI.Container();
        this.hud.ownship = new PIXI.Text({ text: 'OWNSHIP: --\nSECTOR: --', style: ownshipStyle });
        ownshipGroup.addChild(this.hud.ownship);
        this.hud.addChild(ownshipGroup);

        // Right side: Selection
        const selectionGroup = new PIXI.Container();
        this.hud.selection = new PIXI.Text({ text: 'TARGET: --\nSECTOR: --\nRANGE: --', style: selectionStyle });
        this.hud.selection.anchor.x = 1;
        selectionGroup.addChild(this.hud.selection);
        this.hud.addChild(selectionGroup);

        this.hud.ownshipGroup = ownshipGroup;
        this.hud.selectionGroup = selectionGroup;
    }

    updateHUD(data = {}) {
        const { ownship, target, viewport, cursor } = data;

        // Ensure visible, no flicker
        this.hud.visible = true;
        this.hud.alpha = 1;
        this.hud.filters = []; // Ensure no remnant filters

        if (ownship) {
            const coord = MapUtils.toAlphaNumeric(ownship.row, ownship.col);
            const sector = MapUtils.getSector(ownship.row, ownship.col);
            this.hud.ownship.text = `OWNSHIP: ${coord}\nSECTOR: ${sector}`;
        }

        if (target) {
            const coord = MapUtils.toAlphaNumeric(target.row, target.col);
            const sector = MapUtils.getSector(target.row, target.col);
            const range = MapUtils.getRange(ownship || { row: 0, col: 0 }, target);
            this.hud.selection.text = `TARGET: ${coord}\nSECTOR: ${sector}\nRANGE: ${range}`;
        } else {
            this.hud.selection.text = `TARGET: --\nSECTOR: --\nRANGE: --`;
        }

        // Positioning Logic
        const margin = 20;
        const padding = this.labelGutter + 10;
        const hudWidth = this.maskWidth - margin * 2;

        this.hud.ownshipGroup.x = padding;
        this.hud.selectionGroup.x = this.maskWidth - padding + this.labelGutter;

        // "Avoid" logic - Simple Y shift
        // If cursor or ownship is "low", move HUD high.
        const ownshipY = ownship ? (ownship.row * this.currentScale + this.mapContent.y) : -1000;
        // Use a more generous threshold for switching
        const isNearBottom = (ownshipY > this.maskHeight * 0.6);

        const topY = padding;
        const bottomY = this.maskHeight - this.hud.height + this.labelGutter - 10;

        // Lerp position for smoothness? Or just snap. Snap is preferred for UI stability unless requested.
        this.hud.y = isNearBottom ? topY : bottomY;
    }

    updateOwnship(row, col, tint = Colors.text) {
        if (!this.ownshipSprite) return;

        this.ownshipPos = { row, col };
        this.ownshipSprite.visible = true;
        this.ownshipSprite.x = col * this.currentScale + this.currentScale / 2;
        this.ownshipSprite.y = row * this.currentScale + this.currentScale / 2;
        this.ownshipSprite.width = this.currentScale * 0.8;
        this.ownshipSprite.height = this.currentScale * 0.8;
        this.ownshipSprite.tint = tint;
    }


}

