import { BaseController } from './baseController';
import { GlobalPhases, SubmarineStates } from '../constants';
import { MapUtils } from '../feature/map/mapUtils';

/**
 * ConnController
 * Handles logic for the Captain's (Conn) station.
 * Coordinates movement commands and map visualization.
 */
export class ConnController extends BaseController {
    constructor() {
        super();
        this._lastPos = null;

        // Action Mapping
        this.handlers = {
            ...this.handlers,
            'MOVE_HELM': (d) => this.handleMove(d),
            'TORPEDO_BTN': () => this.requestTorpedo(),
            'MINE_BTN': () => this.requestMine(),

            // Map API Routing (routed through feature registry)
            'REQUEST_NAVIGATE': (d) => this.requestNavigate(d),
            'REQUEST_TORPEDO': () => this.requestTorpedo(),
            'REQUEST_MINE_LAY': (d) => this.requestMine(d),
            'SET_INTENT': (d) => this.setMapIntent(d),
            'CENTER_ON_OWNSHIP': () => this.centerMap()
        };
    }

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[ConnController] View bound.');
    }

    onFeaturesBound() {
        super.onFeaturesBound();
        console.log('[ConnController] Features bound.');

        // Internal alias for cleaner access to map feature
        this.map = this.features.map;

        // Set up specific callback for map selection confirmed
        if (this.map) {
            this.map.on('selectionConfirmed', (data) => this.handleMapSelection(data));
        }
    }

    onGameStateUpdate(state) {
        if (!state) return;

        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        if (!sub) return;

        // Cache position for internal logic
        const pos = sub.getPosition();
        this._lastPos = { row: pos.row, col: pos.col };
        console.log(`[ConnController] State Update: Sub at (${pos.row}, ${pos.col})`);

        // Handle START_POSITIONS interrupt
        if (state.phase === GlobalPhases.INTERRUPT && state.activeInterrupt?.type === 'START_POSITIONS') {
            const hasChosen = state.activeInterrupt.data?.submarineIdsWithStartPositionChosen?.includes(sub.getId());
            const playerId = this.socket?.playerId;
            if (!hasChosen && sub.isOwnship(playerId) && sub.getRole(playerId) === 'co') {
                console.log('[ConnController] Requesting Initial Position Selection');
                this.map?.execute('SET_INTENT', { intent: 'POSITION_SELECT' });
            }
        }

        // Update Helm Button States
        this.updateHelmUI(state, sub);
    }

    /**
     * Determines which directional moves are valid and updates button availability.
     */
    updateHelmUI(state, sub) {
        const isLive = state.phase === GlobalPhases.LIVE;
        const isSubmerged = sub.getState() === SubmarineStates.SUBMERGED;

        const validMoves = sub.getValidMoves(state);

        ['N', 'S', 'E', 'W'].forEach(dir => {
            const btn = this.buttons.get(`helm_${dir.toLowerCase()}`);
            if (!btn) return;

            if (!isLive || !isSubmerged) {
                btn.setEnabled(false);
                return;
            }

            const isValid = validMoves.some(m => m.direction === dir);
            btn.setEnabled(isValid);
        });
    }

    getNavigationBlocked(state, sub) {
        const directions = ['N', 'S', 'E', 'W'];
        const validMoves = sub.getValidMoves(state);
        const validDirections = validMoves.map(m => m.direction);

        return directions.filter(dir => !validDirections.includes(dir));
    }

    getMineBlocked(state, sub) {
        const directions = ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'];
        const rowDeltas = { N: -1, S: 1, E: 0, W: 0, NE: -1, NW: -1, SE: 1, SW: -1 };
        const colDeltas = { N: 0, S: 0, E: 1, W: -1, NE: 1, NW: -1, SE: 1, SW: -1 };

        const pos = sub.getPosition();

        return directions.filter(dir => {
            const r = pos.row + rowDeltas[dir];
            const c = pos.col + colDeltas[dir];

            // Re-using logic from MapUtils but routed through SubmarineState
            if (r < 0 || r >= 15 || c < 0 || c >= 15) return true;
            if (state.board[r][c] !== 0) return true;
            return sub.isInPastTrack(r, c) || sub.hasMineAt(r, c);
        });
    }

    handleMove({ direction }) {
        if (this.socket) {
            this.socket.emit('move', direction);
        }
    }

    // --- Feature Routing ---

    requestTorpedo() {
        this.map?.execute('TORPEDO');
    }

    requestMine(data = {}) {
        if (this.lastState && this.map) {
            const subController = this.features.get('submarine');
            const sub = subController?.getOwnship();
            const blocked = data.blocked || (sub ? this.getMineBlocked(this.lastState, sub) : []);
            this.map.execute('MINE_LAY', { ...data, blocked });
        }
    }

    requestNavigate(data = {}) {
        if (this.lastState && this.map) {
            const subController = this.features.get('submarine');
            const sub = subController?.getOwnship();
            const blocked = data.blocked || (sub ? this.getNavigationBlocked(this.lastState, sub) : []);
            this.map.execute('NAVIGATE', { ...data, blocked });
        }
    }

    setMapIntent(data) {
        this.map?.execute('SET_INTENT', data);
    }

    centerMap() {
        this.map?.execute('CENTER');
    }

    handleMapSelection(data) {
        // data should now contain intent or be routed properly by the map feature
        console.log(`[ConnController] Map Selection:`, data);

        // We can check if the map has a current intent if we really need to, 
        // but ideally the event payload handles it. 
        // For now, let's assume the legacy structure for minimal breakage but without PIXI.on

        // If the map feature provides the intent in the data, use it.
        // Otherwise, the map feature should have handled the intent-specific logic.
        const intent = data.intent || (this.map?.view?.mapView?.currentIntent);

        if (intent === 'TORPEDO') {
            this.socket.emit('launch_torpedo', { row: data.coords.row, col: data.coords.col });
        } else if (intent === 'MINE_LAY') {
            this.socket.emit('drop_mine', { row: data.coords.row, col: data.coords.col });
        } else if (intent === 'POSITION_SELECT') {
            this.socket.chooseInitialPosition(data.coords.row, data.coords.col);
        }
    }
}
