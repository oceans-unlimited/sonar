import { Container, Text, Graphics } from 'pixi.js';
import { Colors, Fonts } from '../../../core/uiStyle.js';
import { MapConstants } from '../mapConstants.js';

export class MapLabels {
    constructor(config = {}) {
        this.container = new Container();
        this.container.label = 'MapLabels';
        this.container.eventMode = 'none';

        this.config = {
            gridSize: MapConstants.GRID_SIZE,
            tileSize: MapConstants.DEFAULT_SCALE,
            labelMode: 'COORDINATE', // 'COORDINATE' | 'SECTOR' | 'NONE'
            labelGutter: MapConstants.LABEL_GUTTER,
            rowLabelsRight: false,
            ...config
        };

        this.horizontalLabels = new Container();
        this.horizontalLabels.label = 'HorizontalLabels';
        this.verticalLabels = new Container();
        this.verticalLabels.label = 'VerticalLabels';
        this.sectorLabels = new Container();
        this.sectorLabels.label = 'SectorLabels';

        this.hBackground = new Graphics();
        this.hBackground.label = 'HorizontalLabelBackground';
        this.vBackground = new Graphics();
        this.vBackground.label = 'VerticalLabelBackground';

        this.horizontalLabels.addChild(this.hBackground);
        this.verticalLabels.addChild(this.vBackground);

        // Overlays go ABOVE background but BELOW text
        this.hOverlay = new Graphics();
        this.hOverlay.label = 'HorizontalLabelOverlay';
        this.vOverlay = new Graphics();
        this.vOverlay.label = 'VerticalLabelOverlay';

        this.horizontalLabels.addChild(this.hOverlay);
        this.verticalLabels.addChild(this.vOverlay);

        this.container.addChild(this.horizontalLabels, this.verticalLabels, this.sectorLabels);

        this.axisLabels = { h: [], v: [] };

        // Track which rows/cols are highlighted
        this.activeOverlays = {
            row: new Map(), // Key: row index, Value: { color, alpha }
            col: new Map()  // Key: col index, Value: { color, alpha }
        };

        this._initLabels();
        this._drawBackgrounds();
        this.updateConfig(this.config);
    }

    _labelStyle() {
        return {
            fontFamily: Fonts.header.family || "Goldman-Bold",
            fontSize: 20,
            fill: Colors.text || 0x28ee28,
            // dropShadow: { blur: 2, color: 0x000000, distance: 1, alpha: 0.5 }
        };
    }

    _initLabels() {
        const { gridSize } = this.config;
        const style = this._labelStyle();

        for (let i = 0; i < gridSize; i++) {
            const hText = new Text({ text: String.fromCharCode(65 + i), style });
            hText.anchor.set(0.5, 0.5);
            this.horizontalLabels.addChild(hText);
            this.axisLabels.h.push(hText);

            const vText = new Text({ text: (i + 1).toString(), style });
            vText.anchor.set(0.5, 0.5);
            this.verticalLabels.addChild(vText);
            this.axisLabels.v.push(vText);
        }

        const sectorLabelStyle = { ...style, fontSize: 24, alpha: 0.6 };
        for (let i = 1; i <= 9; i++) {
            const text = new Text({ text: i.toString(), style: sectorLabelStyle });
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

        this._drawBackgrounds();
        this.renderOverlays();
    }

    // --- Overlay Rendering ---

    setOverlay(type, index, color = 0xFFFFFF, alpha = 0.3) {
        if (this.activeOverlays[type]) {
            this.activeOverlays[type].set(index, { color, alpha });
            this.renderOverlays();
        }
    }

    hideOverlay(type, index) {
        if (this.activeOverlays[type] && this.activeOverlays[type].delete(index)) {
            this.renderOverlays();
        }
    }

    clearAllOverlays() {
        this.activeOverlays.row.clear();
        this.activeOverlays.col.clear();
        this.renderOverlays();
    }

    renderOverlays() {
        this.hOverlay.clear();
        this.vOverlay.clear();

        const { tileSize, labelGutter, labelMode } = this.config;
        if (labelMode !== 'COORDINATE') return;

        // Reset all text colors
        const defaultStyle = this._labelStyle();
        this.axisLabels.h.forEach(t => t.style.fill = defaultStyle.fill);
        this.axisLabels.v.forEach(t => t.style.fill = defaultStyle.fill);

        // Draw Row highlights (vertical labels)
        for (const [rowIdx, overlay] of this.activeOverlays.row) {
            const y = rowIdx * tileSize;
            this.vOverlay.rect(-labelGutter / 2, y, labelGutter, tileSize);
            this.vOverlay.fill({ color: overlay.color, alpha: overlay.alpha });

            if (this.axisLabels.v[rowIdx]) {
                this.axisLabels.v[rowIdx].style.fill = 0x000000; // Invert to black
            }
        }

        // Draw Col highlights (horizontal labels)
        for (const [colIdx, overlay] of this.activeOverlays.col) {
            const x = colIdx * tileSize;
            this.hOverlay.rect(x, -labelGutter / 2, tileSize, labelGutter);
            this.hOverlay.fill({ color: overlay.color, alpha: overlay.alpha });

            if (this.axisLabels.h[colIdx]) {
                this.axisLabels.h[colIdx].style.fill = 0x000000; // Invert to black
            }
        }
    }

    /**
     * Automates the drawing of "L" shaped backing for the axis labels.
     */
    _drawBackgrounds() {
        const { gridSize, tileSize, labelGutter } = this.config;
        const totalSize = gridSize * tileSize;

        // Stroke color matches the grid lines (from MapGrid.js)
        const strokeStyle = { width: 1, color: 0x005500 };

        this.hBackground.clear()
            .rect(0, -labelGutter / 2, totalSize, labelGutter)
            .fill({ color: Colors.background })
            .stroke(strokeStyle);

        this.vBackground.clear()
            .rect(-labelGutter / 2, 0, labelGutter, totalSize)
            .fill({ color: Colors.background })
            .stroke(strokeStyle);
    }

    syncPosition(mapX, mapY, viewWidth = 0, viewHeight = 0) {
        const { labelGutter, rowLabelsRight } = this.config;

        this.horizontalLabels.x = mapX;
        this.horizontalLabels.y = labelGutter / 2;

        // mapY spans vertically (for verticalLabels 1-15)
        this.verticalLabels.y = mapY;

        if (rowLabelsRight && viewWidth > 0) {
            this.verticalLabels.x = viewWidth - labelGutter / 2;
        } else {
            this.verticalLabels.x = labelGutter / 2;
        }

        this.sectorLabels.x = mapX;
        this.sectorLabels.y = mapY;
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
