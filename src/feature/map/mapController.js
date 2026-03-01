import { BaseController } from '../../control/baseController';
import { MapConstants } from './mapConstants';

/**
 * MapController
 * Handles server synchronization and filtered rendering for map features.
 * Adheres to Polymorphic Architecture with strict separation of concerns.
 */
export class MapController extends BaseController {
    constructor() {
        super();
        this.rowLabelsRight = false;
        this._lastPos = null;
        this.ownSubId = null;
        this.role = null;

        this._prevInterruptType = null;
        this._sonarFadeTimeout = null;

        // ─────────── Action Map ───────────
        this.handlers = {
            ...this.handlers,

            // --- Server-Driven Events ---
            // These usually come via SocketManager from the server
            'SONAR_PING': (d) => this.handleSonarPing(d),
            'CLEAR_OVERLAYS': () => {
                if (this.view && this.view.mapView) this.view.mapView.clearAllOverlays();
            },

            // --- Client-Local Intents ---
            // These are UI-only changes triggered by parent scenes or debug tools
            'TOGGLE_ROW_LABELS': () => this.handleToggleRowLabels(),
            'SET_INTENT': (d) => {
                if (this.view?.mapView) this.view.mapView.setIntent(d.intent);
            },
            'CENTER_ON_OWNSHIP': () => {
                if (this.view?.mapView && this._lastPos) {
                    this.view.mapView.centerOn(this._lastPos.row, this._lastPos.col, true);
                }
            }
        };
    }

    // ─────────── Server Logic (State Sync) ───────────

    /**
     * Triggered every time the server broadcasts a new state.
     */
    onGameStateUpdate(state) {
        if (!state || !state.submarines || !this.socket) return;

        // 1. Identity & Context Parsing
        const filteredData = this.parseFilteredState(state);
        if (!filteredData) return;

        // 2. Update Map Visuals based on Filtered State (Visibility Matrix)
        this.updateMapVisuals(filteredData, state);

        // 3. Handle Specialized Contexts (Sonar Persistence)
        this.handleContextualVisuals(state);
    }

    /**
     * Universal Parsing System
     * Determines map identity and visibility context from canonical server structures.
     */
    parseFilteredState(state) {
        const playerId = this.socket.playerId;
        if (!playerId) return null;

        // 1. Which submarine does this client belong to?
        const ownSub = state.submarines.find(sub =>
            sub.co === playerId ||
            sub.xo === playerId ||
            sub.sonar === playerId ||
            sub.eng === playerId
        );

        if (!ownSub) return null;

        this.ownSubId = ownSub.id;

        // Identify role for visibility matrix
        if (ownSub.co === playerId) this.role = 'co';
        else if (ownSub.xo === playerId) this.role = 'xo';
        else if (ownSub.sonar === playerId) this.role = 'sonar';
        else if (ownSub.eng === playerId) this.role = 'eng';

        return {
            ownSub,
            role: this.role,
            context: {
                phase: state.phase,
                activeInterrupt: state.activeInterrupt,
                subState: ownSub.submarineState
            },
            enemies: state.submarines.filter(sub => sub.id !== ownSub.id)
        };
    }

    /**
     * Updates map visibility based on role and context matrix.
     */
    updateMapVisuals(filteredData, fullState) {
        const { ownSub, role, context } = filteredData;
        const mv = this.view?.mapView;
        if (!mv) return;

        // Position Updates (Ownship)
        const { row, col } = ownSub;
        if (row !== undefined && col !== undefined) {
            if (!this._lastPos || this._lastPos.row !== row || this._lastPos.col !== col) {
                const isInitial = !this._lastPos;
                this._lastPos = { row, col };

                // Auto-center logic (Captain only)
                const shouldCenter = (role === 'co');
                mv.setOwnShipPosition(row, col, !isInitial, shouldCenter);
            }
        }

        // --- Filtering Matrix Logic (Canonical Names) ---

        // 1. Opponent Visibility
        let isEnemyVisible = (context.phase === 'GAME_OVER');
        mv.setOpponentVisible(isEnemyVisible);

        // 2. past_track Visibility (CONN only)
        mv.setPastTrackVisible(role === 'co');

        // 3. mines Visibility (co, sonar)
        mv.setMinesVisible(role === 'co' || role === 'sonar');

        // 4. terrain Visibility (reg/tactical scales only)
        mv.setTerrainVisible(role !== 'xo');
    }

    /**
     * Handles temporal server-driven visuals (e.g., Sonar).
     */
    handleContextualVisuals(state) {
        const mv = this.view?.mapView;
        if (!mv) return;

        const interrupt = state.activeInterrupt;
        const currentInterruptType = interrupt?.type;

        // SONAR_PING Sync
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
            // Start persistence timer when interrupt ends
            const delay = MapConstants.SONAR_PERSISTENCE_MS || 8000;
            this._sonarFadeTimeout = setTimeout(() => {
                if (this.view?.mapView) this.view.mapView.clearAllOverlays();
                this._sonarFadeTimeout = null;
            }, delay);
        }

        this._prevInterruptType = currentInterruptType;
    }

    handleSonarPing(data) {
        if (this.view?.mapView) {
            const axis = data.axis || 'row';
            const color = data.color || 0xFFFF00;
            const alpha = data.alpha || 0.5;
            this.view.mapView.highlightGridRange(data, axis, color, alpha);
        }
    }

    // ─────────── Client Logic (UI Intents) ───────────

    handleToggleRowLabels() {
        this.rowLabelsRight = !this.rowLabelsRight;
        if (this.view && this.view.mapView) {
            this.view.mapView.setRowLabelsSide(this.rowLabelsRight);
        }
    }

    /**
     * Internal event binder for scene interaction.
     */
    onViewBound(view) {
        super.onViewBound(view);
        if (this.view && this.view.mapView) {
            const mv = this.view.mapView;
            mv.viewBox.on('map:clicked', (data) => this.handleMapClick(data));
            mv.viewBox.on('map:stateChanged', (data) => this.handleStateChange(data));
        }
        if (this.lastState) this.onGameStateUpdate(this.lastState);
    }

    /**
     * Logs map state transitions to the debug overlay.
     */
    handleStateChange({ state, oldState }) {
        const msg = `[MapController] State: ${oldState} -> ${state}`;
        console.log(msg);
        if (window.logEvent) window.logEvent(msg);
    }

    /**
     * Local UI reaction to clicks (Selection mode).
     */
    handleMapClick(data) {
        if (!this.view || !this.view.mapView) return;
        const mv = this.view.mapView;

        // Gating: Ignore clicks during PAN or ANIMATING
        if (mv.currentState === 'PAN' || mv.currentState === 'ANIMATING') {
            return;
        }

        mv.clearAllOverlays();

        const state = mv.currentState;

        if (state === 'SELECT_ROW') {
            mv.highlightGridRange(data, 'row', 0x00FF00, 0.4);
        } else if (state === 'SELECT_COLUMN') {
            mv.highlightGridRange(data, 'col', 0x00FF00, 0.4);
        } else if (state === 'SELECT_SECTOR') {
            mv.highlightGridRange(data, 'sector', 0x00FF00, 0.4);
        } else {
            // Default: SELECT_SQUARE or similar
            mv.setGridOverlay(data.row, data.col, 0x00FF00, 0.4);
        }

        const msg = `[MapController] Map Clicked (${state}): ${data.row}, ${data.col}`;
        console.log(msg);
        if (window.logEvent) window.logEvent(msg);
    }

    /**
     * Parses positional strings (e.g., "Row 5").
     */
    parseAndHighlightPing(response) {
        if (!response || !this.view?.mapView) return;
        const parts = response.trim().split(/[\s,]+/);
        for (let i = 0; i < parts.length; i += 2) {
            const type = parts[i]?.toLowerCase();
            const value = parts[i + 1]?.toUpperCase();
            if (!type || !value) continue;

            if (type === 'row') {
                const idx = parseInt(value) - 1;
                if (!isNaN(idx)) this.handleSonarPing({ row: idx, axis: 'row' });
            } else if (type === 'column' || type === 'col') {
                const idx = value.charCodeAt(0) - 65;
                if (idx >= 0) this.handleSonarPing({ col: idx, axis: 'col' });
            }
        }
    }

    // ─────────── Outbound Methods (Canonical Emits) ───────────

    sendSonar() { if (this.socket) this.socket.emit('sonar'); }
    submitSonarResponse(res) { if (this.socket) this.socket.emit('submit_sonar_response', res); }
    sendMove(dir) { if (this.socket) this.socket.emit('move', dir); }
}
