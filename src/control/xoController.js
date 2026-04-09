/**
 * XO Controller
 * Handles logic for the XO (First Officer) scene.
 * Manages subsystem charging levels, interaction locks, and server sync.
 */

import { BaseController } from './baseController';
import { SystemColors, Colors } from '../core/uiStyle';
import { simulationClock } from '../core/clock/simulationClock';
import { MapIntents } from '../feature/map/mapConstants';


export class XOController extends BaseController {
    constructor() {
        super();

        this.subsystemLevels = {
            sonar: 0,
            drone: 0,
            mine: 0,
            torpedo: 0,
            silence: 0,
            scenario: 0
        };

        this.maxLevels = {
            sonar: 3,
            drone: 3,
            mine: 3,
            torpedo: 3,
            silence: 5,
            scenario: 5
        };
        
        this.droneSector = null;
        this.isDroneActive = false;


        this.isInteractionLocked = false;

        // --- Handler Map ---
        this.handlers = {
            'SUBSYSTEM_ACTION': (d) => this.handleSubsystemAction(d),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d),
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[XOController] View bound.');

        // Register rows from the view if they exist
        if (view._rows) {
            view._rows.forEach((row, key) => {
                this.registerVisual(`row_${key}`, row);
            });
        }

        // Register MiniMap if present in view
        if (view._miniMap) {
            this.bindFeatures({ map: view._miniMap.controller });
        }
    }

    onFeaturesBound() {
        super.onFeaturesBound();
        console.log('[XOController] Features bound.');

        const map = this.features.get('map');
        if (map) {
            // Set default intent to POSITION_SELECT (Tracking)
            map.execute('SET_INTENT', { intent: MapIntents.POSITION_SELECT });
            
            // Listen for selection confirmations (for both tracking and drones)
            this.subscribeToFeature('map', 'selectionConfirmed', (data) => this.handleMapSelection(data));
        }

        // Initial Sync
        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        if (sub) {
            this._syncWithSubmarine(sub);
        }

        // Handle identity resolution
        this.subscribeToFeature('submarine', 'identity:resolved', ({ sub }) => {
            console.log('[XOController] Identity resolved. Performing sync.');
            this._syncWithSubmarine(sub);
        });

        // Subscribe to state changes (Locking/Unlocking UI)
        this.subscribeToFeature('submarine', 'sub:stateChanged', ({ state }) => {
            console.log(`[XOController] State changed: ${state}`);
            const sub = this.features.get('submarine')?.getOwnship();
            if (sub) this._updateInteractionState(this.lastState, sub);
        });

        // Subscribe to gauge updates
        this.subscribeToFeature('submarine', 'sub:updated', (data) => {
            const sub = this.features.get('submarine')?.getOwnship();
            if (sub) {
                this._syncLevels(sub);
                this._updateInteractionState(this.lastState, sub);
            }
        });

        // Subscribe to damage events
        this.subscribeToFeature('damage', 'damageTaken', ({ current }) => {
            this.pushTeletype(`>>> ALERT: HULL COMPROMISED - ${current} HULL REMAINING <<<`, { color: Colors.caution });
        });
    }

    _syncWithSubmarine(sub) {
        this._syncLevels(sub);
        this._updateInteractionState(this.lastState, sub);
    }

    _syncLevels(sub) {
        const actionGauges = sub.getGauges();
        Object.keys(this.subsystemLevels).forEach(key => {
            if (actionGauges[key] !== undefined) {
                this.subsystemLevels[key] = actionGauges[key];
                const row = this.visuals.get(`row_${key}`);
                if (row && row.setGaugeLevel) row.setGaugeLevel(this.subsystemLevels[key]);
            }
        });
    }

    _updateInteractionState(state, sub) {
        if (!state) return;

        // 2. Interaction State
        const isLive = state.phase === 'LIVE';
        const isMoved = sub.getState() === 'MOVED';
        const movedData = sub.getStateData('MOVED');
        const hasCharged = isMoved && movedData?.xoChargedGauge;
        const isClockRunning = simulationClock.isRunning();

        // Lock interaction if not in live phase, clock not running, already charged after move, or not in MOVED state during turn
        this.isInteractionLocked = !isLive || !isClockRunning || (isMoved && hasCharged) || (!isMoved);

        // Update all rows (interactive state)
        this.visuals.forEach((row, id) => {
            if (!id.startsWith('row_')) return;
            const key = id.replace('row_', '');

            const isFull = this.subsystemLevels[key] >= this.maxLevels[key];
            
            // Interaction logic:
            // 1. Can charge if interaction is NOT locked and gauge is NOT full.
            // 2. Can discharge if phase is LIVE and gauge IS full (independent of MOVED state).
            const canCharge = !this.isInteractionLocked && !isFull;
            const canDischarge = isLive && isFull;

            const isInteractive = canCharge || canDischarge;

            if (row.setInteractiveState) {
                row.setInteractiveState(isInteractive);
            }
            
            // Pulse the row if it's ready to discharge
            if (row.setActive) {
                row.setActive(canDischarge);
            }
        });
    }

    onGameStateUpdate(state) {
        // We only cache the state for reference in logic.
        // View updates are now driven by feature events.
        super.onGameStateUpdate(state);
    }

    // ─────────── Handlers ───────────

    /**
     * Entry point for all subsystem interactions (clicks on linked icon/gauge rows).
     * Decides whether to charge or discharge based on current levels and state.
     */
    handleSubsystemAction({ key }) {
        const isFull = this.subsystemLevels[key] >= this.maxLevels[key];

        if (isFull) {
            this.handleDischarge({ key });
        } else {
            this.handleCharge({ key });
        }
    }

    handleCharge({ key }) {
        if (this.isInteractionLocked) {
            console.warn(`[XOController] Charge interaction locked for ${key}.`);
            return;
        }

        console.log(`[XOController] Charging: ${key}`);
        
        // Specific workflow for Drone: trigger map selection
        if (key === 'drone') {
            const map = this.features.get('map');
            if (map) {
                this.isDroneActive = true;
                map.execute('SET_INTENT', { intent: MapIntents.SECTOR_SELECT });
            }
        }

        this.socket.chargeGauge(key);
    }

    handleDischarge({ key }) {
        // Double check phase
        if (this.lastState?.phase !== 'LIVE') {
            console.warn(`[XOController] Cannot discharge ${key} outside of LIVE phase.`);
            return;
        }

        console.log(`[XOController] Discharging: ${key}`);
        
        // Specific payload for Drone: include stored sector
        const payload = (key === 'drone' && this.droneSector) ? this.droneSector : null;
        this.socket.emit('discharge_gauge', { key, payload });
        
        // Reset drone state after discharge if needed
        if (key === 'drone') {
            this.droneSector = null;
            const droneRow = this.visuals.get('row_drone');
            if (droneRow) {
                const sectorText = droneRow.getChildByLabel('droneSectorText');
                if (sectorText) sectorText.text = "";
            }
        }
    }

    handleMapSelection(data) {
        if (this.isDroneActive) {
            // Drone Sector Selection
            if (data.sector !== undefined) {
                this.droneSector = data.sector;
                this.isDroneActive = false;

                // Update UI display in Drone row
                const droneRow = this.visuals['row_drone'];
                if (droneRow) {
                    const sectorText = droneRow.getChildByLabel('droneSectorText');
                    if (sectorText) sectorText.text = `S${this.droneSector}`;
                }

                // Restore default tracking mode
                const map = this.features.get('map');
                if (map) map.execute('SET_INTENT', { intent: MapIntents.POSITION_SELECT });
            }
        } else {
            // Default Tracking mode (SELECT_SQUARE)
            // Visuals are handled internally by MapIntentBehavior for POSITION_SELECT
            console.log(`[XOController] Tracking enemy at: ${data.row}, ${data.col}`);
        }
    }

}
