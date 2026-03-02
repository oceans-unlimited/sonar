import { BaseController } from './baseController';
import { GlobalPhases, SubmarineStates } from '../constants';

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
        if (this.map?.view?.mapView) {
            this.map.view.mapView.viewBox.on('map:selectionConfirmed', (data) => this.handleMapSelection(data));
        }
    }

    onGameStateUpdate(state) {
        if (!state || !this.socket) return;

        const playerId = this.socket.playerId;
        const sub = state.submarines.find(s =>
            s.co === playerId || s.xo === playerId || s.sonar === playerId || s.eng === playerId
        );

        if (!sub) return;

        // Cache position for internal logic
        this._lastPos = { row: sub.row, col: sub.col };
        console.log(`[ConnController] State Update: Sub at (${sub.row}, ${sub.col})`);

        // Update Helm Button States
        this.updateHelmUI(state, sub);
    }

    /**
     * Determines which directional moves are valid and updates button availability.
     */
    updateHelmUI(state, sub) {
        const isLive = state.phase === GlobalPhases.LIVE;
        const isSubmerged = sub.submarineState === SubmarineStates.SUBMERGED;

        const directions = ['N', 'S', 'E', 'W'];
        const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };
        const lastMove = sub.submarineStateData?.POST_MOVEMENT?.directionMoved;

        directions.forEach(dir => {
            const btn = this.buttons[`helm_${dir.toLowerCase()}`];
            if (!btn) return;

            if (!isLive || !isSubmerged) {
                btn.setEnabled(false);
                return;
            }

            if (lastMove && lastMove !== ' ' && dir === opposite[lastMove]) {
                btn.setEnabled(false);
                return;
            }

            const isValid = this.validateMove(state, sub, dir);
            btn.setEnabled(isValid);
        });
    }

    validateMove(state, sub, dir) {
        const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
        const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

        const newRow = sub.row + rowDeltas[dir];
        const newCol = sub.col + colDeltas[dir];

        if (newRow < 0 || newRow >= state.board.length || newCol < 0 || newCol >= state.board[0].length) return false;
        if (state.board[newRow][newCol] !== 0) return false;

        const inTrack = sub.past_track?.some(pos => pos.row === newRow && pos.col === newCol);
        if (inTrack) return false;

        return true;
    }

    getNavigationBlocked(state, sub) {
        const directions = ['N', 'S', 'E', 'W'];
        const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };
        const lastMove = sub.submarineStateData?.MOVED?.directionMoved;

        return directions.filter(dir => {
            if (lastMove && lastMove !== ' ' && dir === opposite[lastMove]) return true;
            return !this.validateMove(state, sub, dir);
        });
    }

    getMineBlocked(state, sub) {
        const directions = ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'];
        const rowDeltas = { N: -1, S: 1, E: 0, W: 0, NE: -1, NW: -1, SE: 1, SW: 1 };
        const colDeltas = { N: 0, S: 0, E: 1, W: -1, NE: 1, NW: -1, SE: 1, SW: -1 };

        return directions.filter(dir => {
            const r = sub.row + rowDeltas[dir];
            const c = sub.col + colDeltas[dir];
            if (r < 0 || r >= 15 || c < 0 || c >= 15) return true;
            if (state.board[r][c] !== 0) return true;
            if (sub.past_track?.some(pos => pos.row === r && pos.col === c)) return true;
            if (sub.mines?.some(pos => pos.row === r && pos.col === c)) return true;
            return false;
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
            const sub = this.lastState.submarines.find(s => s.id === this.map.ownSubId);
            const blocked = data.blocked || (sub ? this.getMineBlocked(this.lastState, sub) : []);
            this.map.execute('MINE_LAY', { ...data, blocked });
        }
    }

    requestNavigate(data = {}) {
        if (this.lastState && this.map) {
            const sub = this.lastState.submarines.find(s => s.id === this.map.ownSubId);
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
        if (!this.map?.view?.mapView) return;
        const intent = this.map.view.mapView.currentIntent;
        console.log(`[ConnController] Map Selection (${intent}):`, data);

        if (intent === 'TORPEDO') {
            this.socket.emit('launch_torpedo', { row: data.coords.row, col: data.coords.col });
        } else if (intent === 'MINE_LAY') {
            this.socket.emit('drop_mine', { row: data.coords.row, col: data.coords.col });
        }
    }
}
