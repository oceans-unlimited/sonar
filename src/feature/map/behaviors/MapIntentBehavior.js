import { MapIntents, MapConstants } from '../mapConstants.js';
import { Colors, SystemColors, Alphas } from '../../../core/uiStyle.js';
import { MapUtils } from '../mapUtils.js';

/**
 * MapIntentBehavior
 * Coordinates the visual highlights and overlays for various map interaction modes.
 * This class translates high-level game intents into specific grid/label visuals.
 */
export class MapIntentBehavior {
    constructor(mapViewArea) {
        this.mapViewArea = mapViewArea;
        this.overlays = mapViewArea.overlays;
        
        // Internal Context needed for relative visual logic
        this.context = {
            ownship: null,        // { row, col, id, ... }
            stealth: false,       // Current stealth status
            isDroneQuery: false   // Context for SECTOR_SELECT
        };
        
        this.currentIntent = null;
    }

    /**
     * Updates the data context used for calculating relative highlights (like "same row as ownship").
     * @param {object} newContext - Partial context update.
     */
    updateContext(newContext) {
        this.context = { ...this.context, ...newContext };
        // If an intent is active, re-apply it to refresh visuals with new context
        if (this.currentIntent) {
            this.applyIntent(this.currentIntent);
        }
    }

    /**
     * Primary entry point for applying a named intent from a controller.
     * @param {string} intent - MapIntents constant.
     */
    applyIntent(intent) {
        this.currentIntent = intent;
        
        // Always clear existing overlays before applying a new preset
        this.overlays.clearAllOverlays();
        
        if (!intent) return;

        switch (intent) {
            case MapIntents.NAVIGATE:
                this._applyNavigate();
                break;
            case MapIntents.TORPEDO:
                this._applyTorpedo();
                break;
            case MapIntents.MINE_LAY:
                this._applyMineLay();
                break;
            case MapIntents.POSITION_SELECT:
                this._applyPositionSelect();
                break;
            case MapIntents.ROW_SELECT:
                this._applyRowSelect();
                break;
            case MapIntents.COLUMN_SELECT:
                this._applyColumnSelect();
                break;
            case MapIntents.SECTOR_SELECT:
                this._applySectorSelect();
                break;
            default:
                console.warn(`[MapIntentBehavior] Unhandled intent: ${intent}`);
                break;
        }
    }

    // --- Intent Presets ---

    _applyNavigate() {
        const { ownship, stealth } = this.context;
        if (!ownship) return;

        const blue = Colors.roleXO;
        const yellow = SystemColors.vessel; // Using vessel yellow for stealth
        const alpha = Alphas.dim;
        const color = stealth ? yellow : blue;

        // Use global game state from controller if available, otherwise fallback to ownship context
        const state = this.mapViewArea.viewBox.parent?.controller?.lastState;
        
        const possibleMoves = MapUtils.getPossibleMoves(ownship, stealth);
        const validMoves = state ? MapUtils.filterInvalidMoves(state, ownship, possibleMoves) : possibleMoves;

        validMoves.forEach(move => {
            this.overlays.setGridOverlay(move.row, move.col, color, alpha);
        });
    }

    _applyTorpedo() {
        const { ownship } = this.context;
        if (!ownship) return;

        const red = SystemColors.weapons;
        const alpha = Alphas.dim;

        // Diamond range 4 - Filter LAND
        for (let r = 0; r < MapConstants.GRID_SIZE; r++) {
            for (let c = 0; c < MapConstants.GRID_SIZE; c++) {
                if (this._isLand(r, c)) continue;
                const dist = Math.abs(r - ownship.row) + Math.abs(c - ownship.col);
                if (dist > 0 && dist <= 4) {
                    this.overlays.setGridOverlay(r, c, red, alpha);
                }
            }
        }
    }

    _applyMineLay() {
        const { ownship } = this.context;
        if (!ownship) return;

        const red = SystemColors.weapons;
        const alpha = Alphas.dim;

        // Adjacent (orthogonal + diagonal) - Filter LAND
        for (let r = ownship.row - 1; r <= ownship.row + 1; r++) {
            for (let c = ownship.col - 1; c <= ownship.col + 1; c++) {
                if (r === ownship.row && c === ownship.col) continue;
                if (this._isValid(r, c) && !this._isLand(r, c)) {
                    this.overlays.setGridOverlay(r, c, red, alpha);
                }
            }
        }
    }

    _applyPositionSelect() {
        // Handled dynamically on click.
    }

    _applyRowSelect() {
        // Bulk highlighting allows LAND squares.
    }

    _applyColumnSelect() {
        // Bulk highlighting allows LAND squares.
    }

    _applySectorSelect() {
        // Bulk highlighting allows LAND squares.
    }

    /**
     * Updates specific highlights based on active interaction (click/hover).
     * @param {object} data - { row, col }
     */
    handleInteraction(data) {
        if (!this.currentIntent) return;

        const { row, col } = data;
        const { ownship, isDroneQuery } = this.context;

        switch (this.currentIntent) {
            case MapIntents.TORPEDO:
                // SELECT_SQUARE click: No highlighting of land grid squares
                if (this._isLand(row, col)) return;
                this.overlays.setGridOverlay(row, col, SystemColors.weapons, Alphas.medium);
                break;

            case MapIntents.POSITION_SELECT:
                // SELECT_SQUARE click: No highlighting of land grid squares
                if (this._isLand(row, col)) return;
                this.overlays.setGridOverlay(row, col, SystemColors.detection, Alphas.medium);
                break;

            case MapIntents.ROW_SELECT:
                // ROW highlighting allows both highlighting and selection of LAND squares
                this.overlays.clearAllOverlays();
                const rowColor = (ownship && row === ownship.row) ? Colors.roleXO : 0xFF00FF;
                this.overlays.highlightGridRange(row, col, 'row', rowColor, Alphas.dim);
                break;

            case MapIntents.COLUMN_SELECT:
                // COLUMN highlighting allows both highlighting and selection of LAND squares
                this.overlays.clearAllOverlays();
                const colColor = (ownship && col === ownship.col) ? Colors.roleXO : 0xFF00FF;
                this.overlays.highlightGridRange(row, col, 'col', colColor, Alphas.dim);
                break;

            case MapIntents.SECTOR_SELECT:
                // SECTOR highlighting allows both highlighting and selection of LAND squares
                this.overlays.clearAllOverlays();
                let sectorColor = 0xFF00FF; // Default Magenta
                if (isDroneQuery) {
                    sectorColor = SystemColors.detection;
                } else if (ownship) {
                    const ownSector = MapUtils.getSector(ownship.row, ownship.col);
                    const targetSector = MapUtils.getSector(row, col);
                    if (ownSector === targetSector) sectorColor = Colors.roleXO;
                }
                this.overlays.highlightGridRange(row, col, 'sector', sectorColor, Alphas.dim);
                break;
        }
    }

    _isLand(r, c) {
        const state = this.mapViewArea.viewBox.parent?.controller?.lastState;
        if (!state || !state.board) return false;
        const terrain = state.board[r]?.[c];
        // Support both object {type} and raw integer terrain (0=WATER, 1=LAND)
        if (typeof terrain === 'object') return terrain.type === 'LAND' || terrain === 1;
        return terrain !== 0;
    }

    _isValid(r, c) {
        return r >= 0 && r < MapConstants.GRID_SIZE && c >= 0 && c < MapConstants.GRID_SIZE;
    }
}
