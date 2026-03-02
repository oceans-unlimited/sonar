import { Graphics } from 'pixi.js';
import { Colors, Alphas, SystemColors } from '../../../core/uiStyle.js';
import { MapUtils } from '../mapUtils.js';

/**
 * MapOverlays
 * Handles drawing and managing grid highlights for navigation, weapons, and sonar.
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

        // Navigation state
        this.navigationOptions = new Map();
        this.mineOptions = new Map();

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
     * Clears all active grid overlays.
     */
    clearAllOverlays() {
        this.activeOverlays.clear();
        this.navigationOptions.clear();
        this.mineOptions.clear();
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

    /**
     * Highlights available orthogonally adjacent squares for navigation.
     */
    showNavigationOptions(row, col, blocked = []) {
        this.clearAllOverlays();
        const directions = [
            { id: 'N', r: row - 1, c: col },
            { id: 'S', r: row + 1, c: col },
            { id: 'E', r: row, c: col + 1 },
            { id: 'W', r: row, c: col - 1 }
        ];

        const { gridSize } = this.config;
        const navColor = Colors.roleXO;
        const navAlpha = Alphas.dim;

        directions.forEach(dir => {
            if (dir.r < 0 || dir.r >= gridSize || dir.c < 0 || dir.c >= gridSize) return;
            if (blocked.includes(dir.id)) return;

            const key = `${dir.r}-${dir.c}`;
            this.navigationOptions.set(key, dir.id);
            this.activeOverlays.set(key, { row: dir.r, col: dir.c, color: navColor, alpha: navAlpha });
        });

        this.render();
    }

    /**
     * Highlights a diamond-shaped range (Manhattan distance 4) for torpedo targeting.
     */
    showTorpedoRange(row, col) {
        this.clearAllOverlays();
        const { gridSize } = this.config;
        const weaponColor = SystemColors.weapons;
        const rangeAlpha = Alphas.dim;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const dist = Math.abs(r - row) + Math.abs(c - col);
                if (dist > 0 && dist <= 4) {
                    const key = `${r}-${c}`;
                    this.activeOverlays.set(key, { row: r, col: c, color: weaponColor, alpha: rangeAlpha });
                }
            }
        }
        this.render();
    }

    /**
     * Highlights available orthogonally and diagonally adjacent squares for mine laying.
     */
    showMineOptions(row, col, blocked = []) {
        this.clearAllOverlays();
        const directions = [
            { id: 'N', r: row - 1, c: col },
            { id: 'S', r: row + 1, c: col },
            { id: 'E', r: row, c: col + 1 },
            { id: 'W', r: row, c: col - 1 },
            { id: 'NE', r: row - 1, c: col + 1 },
            { id: 'NW', r: row - 1, c: col - 1 },
            { id: 'SE', r: row + 1, c: col + 1 },
            { id: 'SW', r: row + 1, c: col - 1 }
        ];

        const { gridSize } = this.config;
        const weaponColor = SystemColors.weapons;
        const rangeAlpha = Alphas.dim;

        directions.forEach(dir => {
            if (dir.r < 0 || dir.r >= gridSize || dir.c < 0 || dir.c >= gridSize) return;
            if (blocked.includes(dir.id)) return;

            const key = `${dir.r}-${dir.c}`;
            this.mineOptions.set(key, dir.id);
            this.activeOverlays.set(key, { row: dir.r, col: dir.c, color: weaponColor, alpha: rangeAlpha });
        });

        this.render();
    }

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
}
