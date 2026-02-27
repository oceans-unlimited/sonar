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

        // Action Mapping
        this.handlers = {
            ...this.handlers,
            'MOVE_HELM': (d) => this.handleMove(d)
        };
    }

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[ConnController] View bound.');
    }

    onFeaturesBound() {
        super.onFeaturesBound();
        console.log('[ConnController] Features bound.');
    }

    onGameStateUpdate(state) {
        if (!state || !this.socket) return;

        const playerId = this.socket.playerId;
        const sub = state.submarines.find(s =>
            s.co === playerId || s.xo === playerId || s.sonar === playerId || s.eng === playerId
        );

        if (!sub) return;

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

            // Basic availability
            if (!isLive || !isSubmerged) {
                btn.setEnabled(false);
                return;
            }

            // 1. Cannot reverse
            if (lastMove && lastMove !== ' ' && dir === opposite[lastMove]) {
                btn.setEnabled(false);
                return;
            }

            // 2. Validate move (Bounds, Water, Track)
            const isValid = this.validateMove(state, sub, dir);
            btn.setEnabled(isValid);
        });
    }

    validateMove(state, sub, dir) {
        const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
        const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

        const newRow = sub.row + rowDeltas[dir];
        const newCol = sub.col + colDeltas[dir];

        // Bounds check
        const rows = state.board.length;
        const cols = state.board[0].length;
        if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) return false;

        // Water check (0 = Water)
        if (state.board[newRow][newCol] !== 0) return false;

        // Past track check
        const inTrack = sub.pastTrack?.some(pos => pos.row === newRow && pos.col === newCol);
        if (inTrack) return false;

        return true;
    }

    handleMove({ direction }) {
        console.log(`[ConnController] Intent: Move ${direction}`);
        if (this.socket) {
            this.socket.emit('move', direction);
        }
    }
}
