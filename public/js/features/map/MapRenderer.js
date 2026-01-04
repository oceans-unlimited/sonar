import * as PIXI from 'pixi.js';
import { MapConstants } from './mapConstants.js';
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
        this.container.eventMode = 'static';
        this.mapContent = new PIXI.Container();
        this.container.addChild(this.mapContent);


        this.mapGrid = new PIXI.Container();
        this.decorationGrid = new PIXI.Container();
        this.mapContent.addChild(this.mapGrid, this.decorationGrid);

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

        // Ownship Sprite
        this.ownshipSprite = null;
        this.ownshipPos = { row: 0, col: 0 };
        if (this.assets.ownship) {

            this.ownshipSprite = new PIXI.Sprite(this.assets.ownship);
            this.ownshipSprite.anchor.set(0.5);
            this.ownshipSprite.visible = false;
            this.mapContent.addChild(this.ownshipSprite);
        }



        this.renderMap();
        this.renderHUD();

        // Label sync
        this.app.ticker.add(() => {
            if (this.container && !this.container.destroyed) {
                this.horizontalLabels.x = this.mapContent.x;
                this.verticalLabels.y = this.mapContent.y;
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
            fontSize: Math.max(12, this.currentScale / 4),
            fill: Colors.text,
            dropShadow: { blur: 2, color: 0x000000, distance: 1 }
        };

        this.axisLabels.h = [];
        this.axisLabels.v = [];

        for (let i = 0; i < gridSize; i++) {
            const hText = new PIXI.Text({ text: String.fromCharCode(65 + i), style: labelStyle });
            hText.anchor.set(0.5);
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

        this.container.hitArea = new PIXI.Rectangle(x, y, width, height);
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
    highlightHover(row, col) {
        this.clearHover();
        const tile = this.tiles[row][col];
        const effect = applyGlowEffect(tile, this.app, Colors.text);
        effect.steadyOn(0.4);
        this.activeGlows.set('hover', effect);
    }

    clearHover() {
        const effect = this.activeGlows.get('hover');
        if (effect) {
            effect.off();
            this.activeGlows.delete('hover');
        }
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

        const style = { fontFamily: Font.family, fontSize: 13, fill: Colors.text };
        const accentStyle = { ...style, fill: Colors.roleSonar, fontWeight: 'bold' };

        // Left side: Ownship
        const ownshipGroup = new PIXI.Container();
        this.hud.ownship = new PIXI.Text({ text: 'OWNSHIP: --\nSECTOR: --', style: accentStyle });
        ownshipGroup.addChild(this.hud.ownship);
        this.hud.addChild(ownshipGroup);

        // Right side: Selection
        const selectionGroup = new PIXI.Container();
        this.hud.selection = new PIXI.Text({ text: 'TARGET: --\nRANGE: --', style: accentStyle });
        this.hud.selection.anchor.x = 1;
        selectionGroup.addChild(this.hud.selection);
        this.hud.addChild(selectionGroup);

        this.hud.ownshipGroup = ownshipGroup;
        this.hud.selectionGroup = selectionGroup;
    }

    updateHUD(data = {}) {
        const { ownship, target, viewport, cursor } = data;

        if (!this.hud.visible) {
            this.hud.visible = true;
            this.hud.alpha = 0;
            applyFlickerEffect(this.app, [this.hud], 0.3, 30);
            setTimeout(() => {
                this.hud.alpha = 1;
                this.hud.filters = []; // Clean flicker
            }, MapConstants.HUD_ENTRANCE_FLICKER);
        }

        if (ownship) {
            const h = String.fromCharCode(65 + ownship.col);
            const v = ownship.row + 1;
            const sector = Math.floor(ownship.col / 5) + Math.floor(ownship.row / 5) * 3 + 1;
            this.hud.ownship.text = `OWNSHIP: ${h}${v}\nSECTOR: ${sector}`;
        }

        if (target) {
            const h = String.fromCharCode(65 + target.col);
            const v = target.row + 1;
            const range = Math.max(Math.abs(target.col - (ownship?.col || 0)), Math.abs(target.row - (ownship?.row || 0)));
            this.hud.selection.text = `TARGET: ${h}${v}\nRANGE: ${range}`;
        } else {
            this.hud.selection.text = `TARGET: --\nRANGE: --`;
        }

        // Positioning Logic
        const margin = 20;
        const padding = this.labelGutter + 10;
        const hudWidth = this.maskWidth - margin * 2;

        this.hud.ownshipGroup.x = padding;
        this.hud.selectionGroup.x = this.maskWidth - padding + this.labelGutter;

        // "Avoid" logic
        const ownshipY = ownship ? (ownship.row * this.currentScale + this.mapContent.y) : -1000;
        const cursorY = cursor ? cursor.y : -1000;

        const topY = padding;
        const bottomY = this.maskHeight - this.hud.height + this.labelGutter - 10;

        const isNearBottom = (ownshipY > this.maskHeight * 0.7) || (cursorY > this.maskHeight * 0.7);

        this.hud.y = isNearBottom ? topY : bottomY;
    }

    updateOwnship(row, col, tint = 0xffffff) {
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

