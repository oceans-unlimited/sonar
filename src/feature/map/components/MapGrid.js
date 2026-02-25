import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapConstants } from '../mapConstants.js';
import { MapUtils } from '../mapUtils.js';

export class MapGrid {
    constructor(config = {}) {
        this.container = new Container();
        this.container.label = 'MapGrid';
        this.container.eventMode = 'static';

        this.config = {
            gridSize: MapConstants.GRID_SIZE || 15,
            tileSize: MapConstants.DEFAULT_SCALE || 90,
            showGridLines: true,
            showSectorLines: false,
            ...config
        };

        const mapSize = this.config.gridSize * this.config.tileSize;
        this.container.hitArea = new Rectangle(0, 0, mapSize, mapSize);

        this.gridGraphics = new Graphics();
        this.sectorGraphics = new Graphics();

        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.sectorGraphics);

        this.renderGrid();
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Refresh hitArea dimensions based on updated gridSize/tileSize
        const mapSize = this.config.gridSize * this.config.tileSize;
        this.container.hitArea = new Rectangle(0, 0, mapSize, mapSize);

        this.renderGrid();
    }

    renderGrid() {
        this.gridGraphics.clear();
        this.sectorGraphics.clear();

        const { gridSize, tileSize, showGridLines, showSectorLines } = this.config;

        if (showGridLines) {
            const mapSize = gridSize * tileSize;
            this.gridGraphics
                .rect(0, 0, mapSize, mapSize)
                .fill({ color: 0x003300, alpha: 0.3 });

            this.gridGraphics.beginPath();
            for (let i = 0; i <= gridSize; i++) {
                const pos = i * tileSize;
                this.gridGraphics
                    .moveTo(pos, 0)
                    .lineTo(pos, mapSize)
                    .moveTo(0, pos)
                    .lineTo(mapSize, pos);
            }
            this.gridGraphics.stroke({ width: 1, color: 0x005500 });
        }

        if (showSectorLines) {
            const sectorSize = tileSize * 5; // 5 tiles per sector
            this.sectorGraphics.beginPath();
            for (let i = 0; i <= 3; i++) {
                const pos = i * sectorSize;
                this.sectorGraphics
                    .moveTo(pos, 0)
                    .lineTo(pos, sectorSize * 3)
                    .moveTo(0, pos)
                    .lineTo(sectorSize * 3, pos);
            }
            this.sectorGraphics.stroke({ width: 2, color: 0x00aa00, alpha: 0.5 });

            // Highlight frame boundaries slightly
            this.sectorGraphics.rect(0, 0, sectorSize * 3, sectorSize * 3)
                .stroke({ width: 3, color: 0x00ff00, alpha: 0.2 });
        }
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
