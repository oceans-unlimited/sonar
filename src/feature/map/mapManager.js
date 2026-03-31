import { EventEmitter } from 'pixi.js';

/**
 * Map Feature (Manager)
 * Persistent application-level singleton that manages the abstract "Spatial Model".
 * Acts as the authoritative database for static and shared spatial entities.
 * 
 * Responsibilities:
 * 1. Authority for Terrain (Land/Water).
 * 2. Authority for Global Mines (Tracking owner subId).
 * 3. Provider of getSpatialObstacles() for navigation validation.
 * 
 * Data Flow (Passive/Injected):
 * - Submarine Feature -> syncMines()
 * - SceneManager/Submarine -> setTerrain()
 * - SceneManager/Submarine -> setContext()
 */
class MapManager extends EventEmitter {
    constructor() {
        super();
        this._terrain = null;
        this._gamePhase = 'LOBBY';
        this._activeInterrupt = null;
        this._enemyPingData = null;
        this._allMines = []; // Array of { row, col, subId }
    }

    // ─────────── Injection API ───────────

    /**
     * Called by the Submarine feature to sync the global mine database.
     */
    syncMines(mines) {
        // mines: Array<{row, col, subId}>
        this._allMines = [...mines];
        this.emit('map:entitiesUpdated');
    }

    setTerrain(terrain) {
        if (this._terrain !== terrain) {
            this._terrain = terrain;
            this.emit('map:terrainLoaded', this._terrain);
        }
    }

    setContext(phase, interrupt) {
        const ctxChanged = this._gamePhase !== phase || this._activeInterrupt?.type !== interrupt?.type;
        this._gamePhase = phase;
        this._activeInterrupt = interrupt;

        if (ctxChanged) {
            this.emit('map:contextUpdated', {
                phase: this._gamePhase,
                interrupt: this._activeInterrupt
            });
        }
    }

    /**
     * Historical/Internal method for tracking opponent pings.
     */
    handleEnemyPing(data) {
        this._enemyPingData = data;
        this.emit('map:enemyPinged', this._enemyPingData);
    }

    // ─────────── Logical Public API ───────────

    /**
     * Authoritative spatial query for obstacles.
     * @param {object} coords - { row, col }
     * @param {string} submarineId - The subId of the vessel querying (ownship)
     * @returns {'CLEAR' | 'BLOCKED_BY_TERRAIN' | 'BLOCKED_BY_MINE' | 'OUT_OF_BOUNDS'}
     */
    getSpatialObstacles(coords, submarineId) {
        const { row, col } = coords;

        // 1. OUT_OF_BOUNDS (15x15 grid)
        if (row < 0 || row >= 15 || col < 0 || col >= 15) {
            return 'OUT_OF_BOUNDS';
        }

        // 2. BLOCKED_BY_TERRAIN
        if (this._terrain && this._terrain[row] !== undefined && this._terrain[row][col] !== undefined) {
            const raw = this._terrain[row][col];
            // Support both object {type} and raw integer terrain (0=WATER, 1=LAND)
            const isLand = (typeof raw === 'object') ? (raw.type === 'LAND') : (raw !== 0);
            if (isLand) {
                return 'BLOCKED_BY_TERRAIN';
            }
        }

        // 3. BLOCKED_BY_MINE (Only blocked if owned by the querying sub)
        const mine = this._allMines.find(m => m.row === row && m.col === col && m.subId === submarineId);
        if (mine) {
            return 'BLOCKED_BY_MINE';
        }

        return 'CLEAR';
    }

    getTerrain() { return this._terrain; }

    /**
     * Returns all mines for a specific sub.
     */
    getMinesForSub(subId) {
        return this._allMines.filter(m => m.subId === subId);
    }

    getRoleContext() {
        return {
            phase: this._gamePhase,
            interrupt: this._activeInterrupt
        };
    }

    getEnemyPingData() { return this._enemyPingData; }

    reset() {
        this._terrain = null;
        this._gamePhase = 'LOBBY';
        this._activeInterrupt = null;
        this._enemyPingData = null;
        this._allMines = [];
    }
}

export const mapManager = new MapManager();
