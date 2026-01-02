import * as PIXI from 'pixi.js';
import { MapConstants } from './mapConstants.js';

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

        this.currentScale = this.config.tileSize;
        this.maskWidth = 0;
        this.maskHeight = 0;

        this.renderMap();

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

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const tile = new PIXI.Graphics()
                    .rect(0, 0, this.currentScale, this.currentScale)
                    .fill({ color: 0x003300, alpha: 0.3 })
                    .stroke({ width: 1, color: 0x005500 });
                tile.x = col * this.currentScale;
                tile.y = row * this.currentScale;
                this.mapGrid.addChild(tile);
            }
        }

        const labelStyle = {
            fontFamily: 'Goldman',
            fontSize: Math.max(12, this.currentScale / 4),
            fill: 0x00ff00,
            dropShadow: { blur: 2, color: 0x000000, distance: 1 }
        };

        for (let i = 0; i < gridSize; i++) {
            const hText = new PIXI.Text({ text: String.fromCharCode(65 + i), style: labelStyle });
            hText.anchor.set(0.5);
            hText.x = i * this.currentScale + this.currentScale / 2;
            hText.y = this.labelGutter / 2;
            this.horizontalLabels.addChild(hText);

            const vText = new PIXI.Text({ text: (i + 1).toString(), style: labelStyle });
            vText.anchor.set(0.5);
            vText.x = this.labelGutter / 2;
            vText.y = i * this.currentScale + this.currentScale / 2;
            this.verticalLabels.addChild(vText);
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
}
