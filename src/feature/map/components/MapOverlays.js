import { Graphics } from 'pixi.js';
import { MapUtils } from '../mapUtils.js';

/**
 * MapOverlays
 * Primitive layer for drawing grid highlights, ranges, and area overlays.
 * Does not contain game logic; acts as a visual tool for behaviors.
 */
export class MapOverlays {
    constructor(parentContainer, layers, config) {
        this.parent = parentContainer;
        this.layers = layers;
        this.config = config;

        // Selection Overlay Engine
        this.activeOverlays = new Map(); // Key: 'row-col', Value: { row, col, color, alpha }
        this.graphics = new Graphics();
        this.graphics.label = 'GridOverlays';
        this.graphics.eventMode = 'none';

        this.parent.addChild(this.graphics);
        if (this.layers.overlay) {
            this.layers.overlay.attach(this.graphics);
        }

        // Callbacks for structural sync (e.g. labels)
        this.onHighlight = null; // (type, data)
        this.onClear = null;     // ()
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Toggles on an overlay for a specific grid coordinate.
     */
    setGridOverlay(row, col, color = 0xFFFFFF, alpha = 0.3) {
        const key = `${row}-${col}`;
        this.activeOverlays.set(key, { row, col, color, alpha });
        if (this.onHighlight) this.onHighlight('square', { row, col, color, alpha });
        this.render();
    }

    /**
     * Removes the overlay for a specific grid coordinate.
     */
    hideGridOverlay(row, col) {
        const key = `${row}-${col}`;
        if (this.activeOverlays.delete(key)) {
            this.render();
        }
    }

    /**
     * Highlights a linear or area range (row, column, or sector).
     */
    highlightGridRange(row, col, axis, color, alpha) {
        const { gridSize } = this.config;

        if (axis === 'sector') {
            const sectorId = MapUtils.getSector(row, col);
            const bounds = MapUtils.getSectorBounds(sectorId);
            for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
                for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                    const key = `${r}-${c}`;
                    this.activeOverlays.set(key, { row: r, col: c, color, alpha });
                }
            }
        } else {
            const index = axis === 'row' ? row : col;
            for (let i = 0; i < gridSize; i++) {
                const r = axis === 'row' ? index : i;
                const c = axis === 'row' ? i : index;
                const key = `${r}-${c}`;
                this.activeOverlays.set(key, { row: r, col: c, color, alpha });
            }
        }

        // Internal axis-label highlight sync
        if (this.onHighlight) {
            this.onHighlight(axis, { row, col, color, alpha });
        }

        this.render();
    }

    /**
     * Clears all active grid overlays.
     */
    clearAllOverlays() {
        this.activeOverlays.clear();
        if (this.onClear) this.onClear();
        this.render();
    }

    /**
     * Redraws all active overlays onto the Graphics layer.
     */
    render() {
        this.graphics.clear();
        if (this.activeOverlays.size === 0) return;

        const { tileSize } = this.config;

        for (const overlay of this.activeOverlays.values()) {
            const x = overlay.col * tileSize;
            const y = overlay.row * tileSize;

            this.graphics.rect(x, y, tileSize, tileSize);
            this.graphics.fill({ color: overlay.color, alpha: overlay.alpha });
        }
    }
}
