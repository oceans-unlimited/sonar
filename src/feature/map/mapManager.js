import { EventEmitter } from 'pixi.js';
import { socketManager } from '../../core/socketManager.js';
import { submarine } from '../submarine/submarine.js';

/**
 * Map Feature (Manager)
 * Persistent application-level singleton that manages the abstract "Spatial Model".
 * Acts as the absolute truth for terrain, boundaries, and global visual tracking.
 * 
 * Data Flow:
 * - Listens to socketManager purely for the static terrain grid (`state.board`) and phase context.
 * - Listens to the `submarine` feature for dynamic positional data (`submarine:moved`, `submarine:pinged`).
 * - Exposes normalized, role-agnostic data to scene-level `mapController`s.
 */
class MapManager extends EventEmitter {
    constructor() {
        super();
        this._terrain = null;       // 2D Array of board data
        this._ownship = null;       // Reference to local SubmarineState
        this._localRole = null;     // 'co', 'xo', 'sonar', 'eng'
        this._gamePhase = 'LOBBY';  // 'LOBBY', 'LIVE', 'INTERRUPT', 'GAME_OVER'
        this._activeInterrupt = null;
        this._enemyPingData = null; // Stored payload when an enemy ping occurs

        this._init();
    }

    _init() {
        // --- 1. Base Game State & Terrain (from Socket) ---
        socketManager.on('stateUpdate', (state) => {
            if (!state) return;

            // Only update if board changes (rare after init)
            if (state.board && this._terrain !== state.board) {
                this._terrain = state.board;
                this.emit('map:terrainLoaded', this._terrain);
            }

            // Sync phase and interrupt context
            const ctxChanged = this._gamePhase !== state.phase || this._activeInterrupt?.type !== state.activeInterrupt?.type;
            this._gamePhase = state.phase || 'LOBBY';
            this._activeInterrupt = state.activeInterrupt || null;

            if (ctxChanged) {
                this.emit('map:contextUpdated', {
                    phase: this._gamePhase,
                    interrupt: this._activeInterrupt
                });
            }
        });

        // --- 2. Dynamic Entities (from Submarine Singleton) ---

        // Identity Resolution
        submarine.on('identity:resolved', ({ sub, role }) => {
            this._ownship = sub;
            this._localRole = role;
            this.emit('map:identityUpdated', { sub, role });
        });

        // Positional Updates
        submarine.on('submarine:moved', (event) => {
            if (this._ownship && event.id === this._ownship._id) {
                this.emit('map:ownshipMoved', event);
            }
        });

        // Everything Else (Mines, Health/Damage context, etc.)
        submarine.on('submarine:allUpdated', () => {
            // General sync trigger if controllers want to bulk-refresh
            this.emit('map:entitiesUpdated');
        });

        // --- 3. External Network Events (e.g. Sonar Pings) ---
        // Right now Pings arrive via the interrupt payload, but we can also track generic sonar events
        socketManager.on('SONAR_PING', (data) => {
            // Data shape expected from intercept: { row, col, axis, etc. }
            this._enemyPingData = data;
            this.emit('map:enemyPinged', this._enemyPingData);
        });
    }

    // ─────────── Logical Public API ───────────

    getTerrain() { return this._terrain; }

    getOwnshipData() {
        if (!this._ownship) return null;
        return {
            state: this._ownship.getState(),
            position: this._ownship.getPosition(), // {row, col, sector}
            pastTrack: this._ownship.getTrack(),
            mines: this._ownship.getHistory().filter(h => h.isMine), // Abstract example, real structure is in sub._data.mines
            raw: this._ownship // Direct ref if absolutely needed
        };
    }

    getMines() {
        if (!this._ownship || !this._ownship._data.mines) return [];
        return this._ownship._data.mines;
    }

    getLocalRole() { return this._localRole; }

    getRoleContext() {
        return {
            phase: this._gamePhase,
            interrupt: this._activeInterrupt
        };
    }

    getEnemyPingData() { return this._enemyPingData; }

    // Clear out data (e.g., between games or matches)
    reset() {
        this._terrain = null;
        this._ownship = null;
        this._localRole = null;
        this._gamePhase = 'LOBBY';
        this._activeInterrupt = null;
        this._enemyPingData = null;
    }
}

// Export as a singleton
export const mapManager = new MapManager();
