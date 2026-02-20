import * as PIXI from 'pixi.js';
import { Colors, headerFont } from '../../../core/uiStyle.js';

export class MapLabels {
    constructor(config = {}) {
        this.container = new PIXI.Container();
        this.container.label = 'MapLabels';
        this.container.eventMode = 'none';

        this.config = {
            gridSize: 15,
            tileSize: 90,
            labelMode: 'COORDINATE', // 'COORDINATE' | 'SECTOR' | 'NONE'
            labelGutter: 30,
            ...config
        };

        this.horizontalLabels = new PIXI.Container();
        this.horizontalLabels.label = 'HorizontalLabels';
        this.verticalLabels = new PIXI.Container();
        this.verticalLabels.label = 'VerticalLabels';
        this.sectorLabels = new PIXI.Container();
        this.sectorLabels.label = 'SectorLabels';

        this.container.addChild(this.horizontalLabels, this.verticalLabels, this.sectorLabels);

        this.axisLabels = { h: [], v: [] };

        this._initLabels();
        this.updateConfig(this.config);
    }

    _labelStyle() {
        return {
            fontFamily: headerFont.family || "Goldman-Bold",
            fontSize: 20,
            fill: Colors.text || 0x28ee28,
            // dropShadow: { blur: 2, color: 0x000000, distance: 1, alpha: 0.5 }
        };
    }

    _initLabels() {
        const { gridSize } = this.config;
        const style = this._labelStyle();

        for (let i = 0; i < gridSize; i++) {
            const hText = new PIXI.Text({ text: String.fromCharCode(65 + i), style });
            hText.anchor.set(0.5, 0.5);
            this.horizontalLabels.addChild(hText);
            this.axisLabels.h.push(hText);

            const vText = new PIXI.Text({ text: (i + 1).toString(), style });
            vText.anchor.set(0.5, 0.5);
            this.verticalLabels.addChild(vText);
            this.axisLabels.v.push(vText);
        }

        const sectorLabelStyle = { ...style, fontSize: 24, alpha: 0.6 };
        for (let i = 1; i <= 9; i++) {
            const text = new PIXI.Text({ text: i.toString(), style: sectorLabelStyle });
            text.anchor.set(0.5, 0.5);
            this.sectorLabels.addChild(text);
        }
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        const { tileSize, labelMode, labelGutter } = this.config;

        const showCoordinateLabels = labelMode === 'COORDINATE';
        this.horizontalLabels.visible = showCoordinateLabels;
        this.verticalLabels.visible = showCoordinateLabels;
        this.sectorLabels.visible = labelMode === 'SECTOR';

        if (showCoordinateLabels) {
            for (let i = 0; i < this.config.gridSize; i++) {
                const hText = this.axisLabels.h[i];
                // Text does not scale, but spacing does!
                // Offset is relative to the MapLabels container
                hText.x = i * tileSize + tileSize / 2;
                hText.y = 0;

                const vText = this.axisLabels.v[i];
                vText.x = 0;
                vText.y = i * tileSize + tileSize / 2;
            }
        }

        if (labelMode === 'SECTOR') {
            this.sectorLabels.children.forEach((text, idx) => {
                const id = idx + 1;
                const sRow = Math.floor((id - 1) / 3);
                const sCol = (id - 1) % 3;
                text.position.set(
                    (sCol * 5 * tileSize) + (2.5 * tileSize),
                    (sRow * 5 * tileSize) + (2.5 * tileSize)
                );
            });
        }
    }



    syncPosition(mapX, mapY) {
        const { labelGutter } = this.config;

        // Keeps labels aligned with the map track layer but clamped to their axis
        // mapX spans horizontally (for horizontalLabels A-O)
        this.horizontalLabels.x = mapX;
        this.horizontalLabels.y = labelGutter / 2;

        // mapY spans vertically (for verticalLabels 1-15)
        this.verticalLabels.y = mapY;
        this.verticalLabels.x = labelGutter / 2;

        this.sectorLabels.x = mapX;
        this.sectorLabels.y = mapY;
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
