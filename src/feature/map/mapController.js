import { BaseController } from '../../control/baseController';
import { MapConstants, MapStates, MapIntents } from './mapConstants';
import { Colors, SystemColors } from '../../core/uiStyle.js';
import { MapUtils } from './mapUtils.js';
import { mapManager } from './mapManager.js';
import { submarine } from '../submarine/submarine.js';

/**
 * MapController
 * Scene-level view-broker for Map features. 
 * Consumes data from the global mapManager and submarine singletons.
 * Handles UI intent (NAVIGATE, TORPEDO) and filters views based on local role context.
 */
export class MapController extends BaseController {
    constructor() {
        super();
        this.rowLabelsRight = false;

        // Logical state cache
        this._lastPos = null;
        this.ownSubId = null;
        this.role = null;

        this._prevInterruptType = null;
        this._sonarFadeTimeout = null;

        this.commands = {
            'NAVIGATE': (d) => this.requestNavigate(d),
            'TORPEDO': () => this.requestTorpedo(),
            'MINE_LAY': (d) => this.requestMine(d),
            'CENTER': () => this.centerOnOwnship(),
            'SET_INTENT': (d) => this.setIntent(d.intent),
            'TOGGLE_LABELS': () => this.handleToggleRowLabels(),
            'CLEAR': () => this.clearOverlays()
        };

        this.handlers = {
            ...this.handlers,
            'SET_INTENT': (d) => this.execute('SET_INTENT', d),
            'CENTER_ON_OWNSHIP': () => this.execute('CENTER'),
            'REQUEST_NAVIGATE': (d) => this.execute('NAVIGATE', d),
            'REQUEST_TORPEDO': (d) => this.execute('TORPEDO', d),
            'REQUEST_MINE_LAY': (d) => this.execute('MINE_LAY', d),
            'TOGGLE_ROW_LABELS': () => this.execute('TOGGLE_LABELS'),
            'CLEAR_OVERLAYS': () => this.execute('CLEAR')
        };

        this._initMapSubscriptions();
    }

    _initMapSubscriptions() {
        // --- 1. Terrain loaded ---
        mapManager.on('map:terrainLoaded', (board) => {
            // Handled passively by views fetching terrain, or explicit trigger here if needed
        });

        // --- 2. Identity / Role Updated (Filters) ---
        mapManager.on('map:identityUpdated', ({ sub, role }) => {
            this.ownSubId = sub._id;
            this.role = role;
            this.refreshVisuals();
        });

        // --- 3. Positional Updates ---
        mapManager.on('map:ownshipMoved', (event) => {
            this.refreshVisuals();
        });

        // --- 4. Context/Interrupts Updated ---
        mapManager.on('map:contextUpdated', () => {
            this.handleContextualVisuals();
            this.refreshVisuals();
        });

        // --- 5. Enemy Sonar Pings ---
        submarine.on('submarine:pinged', (data) => {
            // Wait, Submarine features tracks this now globally
            // map:enemyPinged is how mapManager exposes it.
        });
        mapManager.on('map:enemyPinged', (data) => {
            this.handleSonarPing(data);
        });
    }

    /**
     * Primary endpoint for external API calls to the map feature.
     */
    execute(cmd, payload = {}) {
        const action = this.commands[cmd];
        if (action) {
            this.logDirectorAction(`Executing command: ${cmd}`);
            return action(payload);
        }
        console.warn(`[MapController] Unknown command: ${cmd}`);
    }

    logDirectorAction(msg) {
        console.log(`[MapController] ${msg}`);
        window.dispatchEvent(new CustomEvent('director:ui_trigger', {
            detail: { action: 'LOG', message: msg }
        }));
    }

    // --- Command Implementations ---

    setIntent(intent) {
        if (this.view?.mapView) {
            this.view.mapView.setIntent(intent);
        }
    }

    clearOverlays() {
        if (this.view?.mapView) {
            this.view.mapView.overlays.clearAllOverlays();
        }
    }

    centerOnOwnship() {
        if (this.view?.mapView && this._lastPos) {
            this.view.mapView.centerOn(this._lastPos.row, this._lastPos.col, true);
        }
    }

    requestNavigate(d = {}) {
        if (this.view?.mapView) {
            const mv = this.view.mapView;
            mv.intentBehavior.updateContext({ stealth: !!d.stealth });
            mv.setIntent(MapIntents.NAVIGATE);
        }
    }

    requestTorpedo() {
        if (this.view?.mapView) {
            this.view.mapView.setIntent(MapIntents.TORPEDO);
        }
    }

    requestMine(d = {}) {
        if (this.view?.mapView) {
            this.view.mapView.setIntent(MapIntents.MINE_LAY);
        }
    }

    handleToggleRowLabels() {
        this.rowLabelsRight = !this.rowLabelsRight;
        if (this.view?.mapView) {
            this.view.mapView.setRowLabelsSide(this.rowLabelsRight);
        }
    }

    // ─────────── Rendering Logic (View Updating) ───────────

    refreshVisuals() {
        const mv = this.view?.mapView;
        if (!mv) return;

        const ownshipData = mapManager.getOwnshipData();
        const role = mapManager.getLocalRole();
        const ctx = mapManager.getRoleContext();

        if (!ownshipData || !role) return;

        const { row, col } = ownshipData.position;
        const isStartPositions = ctx.phase === 'INTERRUPT' && ctx.interrupt?.type === 'START_POSITIONS';
        // Note: activeInterrupt logic regarding 'hasChosen' needs sub data. We use a simple fallback for now.
        const hasChosen = ctx.interrupt?.data?.submarineIdsWithStartPositionChosen?.includes(this.ownSubId);

        // Update intent behavior context
        mv.intentBehavior.updateContext({
            ownship: ownshipData.raw._data, // Keep legacy compatibility for mapUtils expectations for now
            isDroneQuery: ctx.interrupt?.type === 'DRONE'
        });

        if (row !== undefined && col !== undefined) {
            if (!this._lastPos || this._lastPos.row !== row || this._lastPos.col !== col) {
                const isInitial = !this._lastPos;
                this._lastPos = { row, col };

                this.logDirectorAction(`POS UPDATE: (${row}, ${col})`);

                // 1. Update ownship position
                mv.setOwnShipPosition(row, col, false, false);

                // 2. Auto-center logic (Captain only)
                if (role === 'co') {
                    mv.centerOn(row, col, !isInitial);
                }
            }

            // Apply contextual tinting based on start position phase
            if (isStartPositions) {
                if (hasChosen) {
                    mv.setOwnshipTint(SystemColors.detection);
                    mv.setOwnShipPosition(row, col, false, true);
                } else {
                    mv.setOwnshipTint(Colors.text);
                    mv.setOwnShipPosition(row, col, false, false);
                }
            } else {
                mv.setOwnshipTint(Colors.text);
                mv.setOwnShipPosition(row, col, false, true);
            }
        }

        // Contextual Filters defined by Role
        mv.setOpponentVisible(ctx.phase === 'GAME_OVER');
        mv.setPastTrackVisible(role === 'co');
        mv.setMinesVisible(role === 'co' || role === 'sonar');
        mv.setTerrainVisible(role !== 'xo');
    }

    handleContextualVisuals() {
        const mv = this.view?.mapView;
        if (!mv) return;

        const ctx = mapManager.getRoleContext();
        const currentInterruptType = ctx.interrupt?.type;

        // Note: Ping highlighting is generally Sonar's job using getEnemyPingData, but legacy intercept logic
        // placed it here. We'll leave the fade logic intact, triggered by map:enemyPinged explicitly.

        if (this._prevInterruptType === 'SONAR_PING' && currentInterruptType !== 'SONAR_PING') {
            const delay = MapConstants.SONAR_PERSISTENCE_MS || 8000;
            this._sonarFadeTimeout = setTimeout(() => {
                mv.overlays.clearAllOverlays();
                this._sonarFadeTimeout = null;
            }, delay);
        }

        this._prevInterruptType = currentInterruptType;
    }

    handleSonarPing(data) {
        if (this.view?.mapView) {
            const axis = data.axis || 'row';
            this.view.mapView.overlays.highlightGridRange(data.row, data.col, axis, 0xFFFF00, 0.5);

            // Note: If we need to clear previous fade timeout
            if (this._sonarFadeTimeout) {
                clearTimeout(this._sonarFadeTimeout);
                this._sonarFadeTimeout = null;
            }
        }
    }

    onViewBound(view) {
        super.onViewBound(view);
        if (this.view?.mapView) {
            const mv = this.view.mapView;
            mv.onSelectionConfirmed = (data) => this.handleSelectionConfirmed(data);
            mv.onMapClicked = (data) => this.handleMapClick(data);
        }

        // Initial visual sync in case mapManager already has data
        this.refreshVisuals();
    }

    handleSelectionConfirmed(data) {
        this.emit('selectionConfirmed', data);
    }

    handleMapClick(data) {
        if (!this.view?.mapView) return;
        const mv = this.view.mapView;
        if (mv.currentState === MapStates.ANIMATING) return;

        const intent = mv.currentIntent;
        const ownshipData = mapManager.getOwnshipData();
        if (!ownshipData) return;
        const terrain = mapManager.getTerrain();

        const squareData = MapUtils.getSquareData(data, ownshipData.raw._data, terrain);

        mv.intentBehavior.handleInteraction(data);

        // Logical checking
        if (intent === MapIntents.NAVIGATE) {
            const dir = MapUtils.getDirection(ownshipData.position, data);
            if (dir) {
                this.handleSelectionConfirmed({ direction: dir, ...squareData });
            }
            return;
        }

        if (intent === MapIntents.TORPEDO || intent === MapIntents.MINE_LAY || intent === MapIntents.POSITION_SELECT) {
            this.handleSelectionConfirmed(squareData);
            return;
        }

        this.emit('squareSelected', squareData);
    }
}

