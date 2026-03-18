/**
 * XO Controller
 * Handles logic for the XO (First Officer) scene.
 * Manages subsystem charging levels, interaction locks, and server sync.
 */

import { BaseController } from './baseController';
import { SystemColors } from '../core/uiStyle';
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
            'CHARGE_SUBSYSTEM': (d) => this.handleCharge(d),
            'DISCHARGE_SUBSYSTEM': (d) => this.handleDischarge(d),
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
    }


    onGameStateUpdate(state) {
        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        if (!sub) return;

        const actionGauges = sub.getGauges();

        // 1. Sync Levels
        Object.keys(this.subsystemLevels).forEach(key => {
            if (actionGauges[key] !== undefined) {
                this.subsystemLevels[key] = actionGauges[key];
                const row = this.visuals.get(`row_${key}`);
                if (row && row.setGaugeLevel) row.setGaugeLevel(this.subsystemLevels[key]);
            }
        });

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
            const canCharge = !this.isInteractionLocked && !isFull;
            const canDischarge = isLive && isFull;

            if (row.setInteractiveState) {
                row.setInteractiveState(canCharge || canDischarge);
            }
        });
    }

    // ─────────── Handlers ───────────

    handleCharge({ key }) {
        if (this.isInteractionLocked) {
            console.warn('[XOController] Interaction locked.');
            return;
        }

        if (this.subsystemLevels[key] >= this.maxLevels[key]) {
            console.warn(`[XOController] Subsystem ${key} already full.`);
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
        if (this.subsystemLevels[key] < this.maxLevels[key]) return;

        console.log(`[XOController] Discharging: ${key}`);
        
        // Specific payload for Drone: include stored sector
        const payload = (key === 'drone' && this.droneSector) ? this.droneSector : null;
        this.socket.emit('discharge_gauge', { key, payload });
        
        // Reset drone state after discharge if needed
        if (key === 'drone') {
            this.droneSector = null;
            const droneRow = this.visuals['row_drone'];
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
