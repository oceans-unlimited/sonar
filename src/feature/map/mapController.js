import { BaseController } from '../../control/baseController';
import { MapConstants, MapStates, MapIntents } from './mapConstants';
import { Colors, SystemColors } from '../../core/uiStyle.js';
import { MapUtils } from './mapUtils.js';
import { mapManager } from './mapManager.js';

/**
 * MapController
 * Scene-level view-broker for Map features. 
 * Consumes data from the global mapManager (Spatial DB) and submarine features.
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
        // --- 1. Static Spatial Data (from Database) ---
        mapManager.on('map:terrainLoaded', () => {
            this.refreshVisuals();
        });

        mapManager.on('map:contextUpdated', () => {
            this.handleContextualVisuals();
            this.refreshVisuals();
        });

        mapManager.on('map:enemyPinged', (data) => {
            this.handleSonarPing(data);
        });
    }

    /**
     * Bind to the persistent Submarine feature for live position data.
     */
    onFeaturesBound() {
        this.subscribeToFeature('submarine', 'identity:resolved', ({ sub, role }) => {
            this.ownSubId = sub._id;
            this.role = role;
            this.refreshVisuals();
        });

        this.subscribeToFeature('submarine', 'submarine:moved', (event) => {
            // Only refresh if our sub moved
            if (event.id === this.ownSubId) {
                this.refreshVisuals();
            }
        });

        this.subscribeToFeature('submarine', 'submarine:allUpdated', () => {
            this.refreshVisuals();
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
            console.log(`[MapController] Setting intent: ${intent}`);
            this.view.mapView.setIntent(intent);
        }
    }

    clearOverlays() {
        if (this.view?.mapView) {
            this.view.mapView.overlays.clearAllOverlays();
        }
    }

    centerOnOwnship() {
        const sub = this.features.get('submarine')?.getOwnship();
        if (this.view?.mapView && sub) {
            const pos = sub.getPosition();
            this.view.mapView.centerOn(pos.row, pos.col, true);
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

        const subFeature = this.features.get('submarine');
        if (!subFeature) return;

        const ownship = subFeature.getOwnship();
        const role = subFeature.getLocalRole();
        const ctx = mapManager.getRoleContext(); // Context still comes from MapManager (shared spatial state)

        if (!ownship || !role) return;

        const pos = ownship.getPosition();
        const { row, col } = pos;
        
        const isStartPositions = ctx.phase === 'INTERRUPT' && ctx.interrupt?.type === 'START_POSITIONS';
        const hasChosen = ctx.interrupt?.data?.submarineIdsWithStartPositionChosen?.includes(this.ownSubId);

        // Update intent behavior context with the SubmarineState instance
        mv.intentBehavior.updateContext({
            ownship: ownship,
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
        const subFeature = this.features.get('submarine');
        const ownship = subFeature?.getOwnship();
        if (!ownship) return;
        
        const terrain = mapManager.getTerrain();

        const squareData = MapUtils.getSquareData(data, ownship, terrain);

        mv.intentBehavior.handleInteraction(data);

        // Logical checking
        if (intent === MapIntents.NAVIGATE) {
            const dir = MapUtils.getDirection(ownship.getPosition(), data);
            if (dir) {
                this.handleSelectionConfirmed({ direction: dir, ...squareData });
            }
            return;
        }

        if (intent === MapIntents.TORPEDO || intent === MapIntents.MINE_LAY || intent === MapIntents.POSITION_SELECT) {
            this.handleSelectionConfirmed(squareData);
            return;
        }

        console.log('[MapController] Map clicked with no actionable intent. Emitting squareSelected for generic handling.', squareData);
        this.emit('squareSelected', squareData);
    }
}
