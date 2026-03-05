import { BaseController } from '../../control/baseController';
import { MapConstants, MapStates, MapIntents } from './mapConstants';
import { Colors, SystemColors, Alphas } from '../../core/uiStyle.js';
import { MapUtils } from './mapUtils.js';

/**
 * MapController
 * Handles server synchronization and filtered rendering for map features.
 * Acts as the primary API endpoint for the map feature.
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

        // Redundant with BaseController but kept for explicit mapping
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
    }

    /**
     * Primary endpoint for external API calls to the map feature.
     * @param {string} cmd - Command name
     * @param {any} payload - Optional data
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
        // Log to Director Panel's event log
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
            // Update behavior context with stealth if provided
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

    // ─────────── Section: Server Logic (State Sync) ───────────

    onGameStateUpdate(state) {
        if (!state || !state.submarines || !this.socket) return;
        const filteredData = this.parseFilteredState(state);
        if (!filteredData) return;

        // Sync behavior context
        if (this.view?.mapView) {
            this.view.mapView.intentBehavior.updateContext({
                ownship: filteredData.ownSub,
                isDroneQuery: state.activeInterrupt?.type === 'DRONE'
            });
        }

        this.updateMapVisuals(filteredData, state);
        this.handleContextualVisuals(state);
    }

    parseFilteredState(state) {
        const playerId = this.socket.playerId;
        if (!playerId) {
            console.warn('[MapController] No playerId on socket. Cannot parse state.');
            return null;
        }

        const ownSub = state.submarines.find(sub =>
            sub.co === playerId || sub.xo === playerId || sub.sonar === playerId || sub.eng === playerId
        );

        if (!ownSub) {
            console.warn(`[MapController] Player ${playerId} not found in any submarine.`);
            return null;
        }

        this.ownSubId = ownSub.id;

        const roleMap = { co: 'co', xo: 'xo', sonar: 'sonar', eng: 'eng' };
        for (const [key, val] of Object.entries(roleMap)) {
            if (ownSub[key] === playerId) {
                this.role = val;
                break; // Prioritize first found role (Capt, XO, etc)
            }
        }

        console.log(`[MapController] Parsed identity: Sub=${this.ownSubId}, Role=${this.role}, ID=${playerId}`);

        return {
            ownSub,
            role: this.role,
            context: {
                phase: state.phase,
                activeInterrupt: state.activeInterrupt,
                subState: ownSub.submarineState
            }
        };
    }

    updateMapVisuals(filteredData, fullState) {
        const { ownSub, role, context } = filteredData;
        const mv = this.view?.mapView;
        if (!mv) return;

        const { row, col } = ownSub;
        console.log(`[MapController] updateMapVisuals: (${row}, ${col}), Role: ${role}`);

        const isStartPositions = context.phase === 'INTERRUPT' && context.activeInterrupt?.type === 'START_POSITIONS';
        const hasChosen = context.activeInterrupt?.data?.submarineIdsWithStartPositionChosen?.includes(ownSub.id);

        if (row !== undefined && col !== undefined) {
            if (!this._lastPos || this._lastPos.row !== row || this._lastPos.col !== col) {
                const isInitial = !this._lastPos;
                this._lastPos = { row, col };

                this.logDirectorAction(`POS UPDATE: (${row}, ${col})`);

                // 1. Update ownship position
                mv.setOwnShipPosition(row, col, false, false);

                // 2. Auto-center logic (Captain only, animated transition)
                if (role === 'co') {
                    mv.centerOn(row, col, !isInitial);
                }
            }

            // Apply contextual tinting
            if (isStartPositions) {
                if (hasChosen) {
                    mv.setOwnshipTint(SystemColors.detection); // Green for chosen
                    mv.setOwnShipPosition(row, col, false, true); // Ensure visible
                } else {
                    mv.setOwnshipTint(Colors.text);
                    mv.setOwnShipPosition(row, col, false, false); // Hide if not chosen (placeholder 0,0)
                }
            } else {
                mv.setOwnshipTint(Colors.text);
                mv.setOwnShipPosition(row, col, false, true);
            }
        }

        mv.setOpponentVisible(context.phase === 'GAME_OVER');
        mv.setPastTrackVisible(role === 'co');
        mv.setMinesVisible(role === 'co' || role === 'sonar');
        mv.setTerrainVisible(role !== 'xo');
    }

    handleContextualVisuals(state) {
        const mv = this.view?.mapView;
        if (!mv) return;

        const interrupt = state.activeInterrupt;
        const currentInterruptType = interrupt?.type;

        if (currentInterruptType === 'SONAR_PING') {
            const response = interrupt.payload?.response;
            if (response) {
                this.parseAndHighlightPing(response);
                if (this._sonarFadeTimeout) {
                    clearTimeout(this._sonarFadeTimeout);
                    this._sonarFadeTimeout = null;
                }
            }
        }
        else if (this._prevInterruptType === 'SONAR_PING') {
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
        }
    }

    onViewBound(view) {
        super.onViewBound(view);
        if (this.view?.mapView) {
            const mv = this.view.mapView;
            // Behavior-driven event delegation
            mv.onSelectionConfirmed = (data) => this.handleSelectionConfirmed(data);
            mv.onMapClicked = (data) => this.handleMapClick(data);
        }
        if (this.lastState) this.onGameStateUpdate(this.lastState);
    }

    handleSelectionConfirmed(data) {
        // Relay to parent controller if needed, or handle locally
        this.emit('selectionConfirmed', data);
    }

    handleMapClick(data) {
        if (!this.view?.mapView) return;
        const mv = this.view.mapView;
        if (mv.currentState === MapStates.ANIMATING) return;

        const intent = mv.currentIntent;
        const ownship = this.lastState?.submarines?.find(s => s.id === this.ownSubId);
        const squareData = MapUtils.getSquareData(data, ownship, this.lastState?.board);

        // Visual handling delegated to behavior
        mv.intentBehavior.handleInteraction(data);

        // Logical handling remains in controller
        if (intent === MapIntents.NAVIGATE) {
            const dir = MapUtils.getDirection(ownship, data);
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
