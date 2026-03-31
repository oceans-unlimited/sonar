import { BaseController } from './baseController';
import { GlobalPhases, SubmarineStates } from '../constants';
import { MapUtils } from '../feature/map/mapUtils';

/**
 * ConnController
 * Handles logic for the Captain's (Conn) station.
 * Coordinates movement commands, stealth navigation, and map visualization.
 */
export class ConnController extends BaseController {
    constructor() {
        super();
        this._lastPos = null;
        this._stealthActive = false;

        // Action Mapping
        this.handlers = {
            ...this.handlers,
            'MOVE_HELM': (d) => this.handleMove(d),
            'TORPEDO_BTN': () => this.requestTorpedo(),
            'MINE_BTN': () => this.requestMine(),
            'TOGGLE_STEALTH': () => this.toggleStealth(),

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
        this.map = this.features.get('map');

        // Set up specific callback for map selection confirmed
        if (this.map) {
            this.map.on('selectionConfirmed', (data) => this.handleMapSelection(data));
        }
    }

    onGameStateUpdate(state) {
        if (!state) return;

        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        
        console.log(`[ConnController] onGameStateUpdate. Sub found: ${!!sub}, Phase: ${state.phase}, SubState: ${sub?.getState()}`);
        console.log(`[ConnController] Registered buttons:`, Array.from(this.buttons.keys()));

        if (!sub) return;

        // Cache position for internal logic
        const pos = sub.getPosition();
        this._lastPos = { row: pos.row, col: pos.col };
        console.log(`[ConnController] Sub at (${pos.row}, ${pos.col})`);

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

        // Update stealth button state
        this.updateStealthUI(sub);

        // Auto-Trigger Map Navigation Intent
        if (state.phase === GlobalPhases.LIVE && sub.getState() === SubmarineStates.SUBMERGED) {
            if (this._stealthActive) {
                if (this.map && this.map.view?.mapView?.currentIntent !== 'NAVIGATE') {
                    this.map.execute('NAVIGATE', { stealth: true });
                }
            } else {
                if (this.map && this.map.view?.mapView?.currentIntent !== 'NAVIGATE') {
                    this.map.execute('SET_INTENT', { intent: 'NAVIGATE' });
                }
            }
        } else {
            // Clear navigation overlays when not submerged or not live
            if (this.map && this.map.view?.mapView?.currentIntent === 'NAVIGATE') {
                console.log('[ConnController] Clearing NAVIGATE intent (not submerged)');
                this.map.execute('SET_INTENT', { intent: null });
            }
        }
    }

    /**
     * Determines which directional moves are valid and updates button availability.
     */
    updateHelmUI(state, sub) {
        const isLive = state.phase === GlobalPhases.LIVE;
        const subState = sub.getState();
        const isSubmerged = subState === SubmarineStates.SUBMERGED;

        console.log(`[ConnController] updateHelmUI: phase=${state.phase}, subState=${subState}, isLive=${isLive}, isSubmerged=${isSubmerged}`);

        const validMoves = sub.getValidMoves(this._stealthActive);
        console.log(`[ConnController] Valid moves:`, validMoves);

        ['N', 'S', 'E', 'W'].forEach(dir => {
            const btnKey = `helm_${dir.toLowerCase()}`;
            const btn = this.buttons.get(btnKey);
            
            if (!btn) {
                console.warn(`[ConnController] Button not found in registry: ${btnKey}`);
                return;
            }

            if (!isLive || !isSubmerged) {
                console.log(`[ConnController] LOCKOUT: Disabling ${dir}`);
                btn.setEnabled(false);
                return;
            }

            // In stealth mode, helm buttons are disabled — movement goes through map click
            if (this._stealthActive) {
                btn.setEnabled(false);
                return;
            }

            const isValid = validMoves.some(m => m.direction === dir);
            console.log(`[ConnController] Move ${dir} validity: ${isValid}`);
            btn.setEnabled(isValid);
        });
    }

    /**
     * Updates stealth button visual state based on silence gauge.
     */
    updateStealthUI(sub) {
        const btn = this.buttons.get('silent_running');
        if (!btn) return;

        // Button is always enabled per user spec — but press handler checks charge
        btn.setEnabled(true);
    }

    getNavigationBlocked(state, sub) {
        const directions = ['N', 'S', 'E', 'W'];
        const validMoves = sub.getValidMoves(false);
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

            if (r < 0 || r >= 15 || c < 0 || c >= 15) return true;
            if (state.board[r][c] !== 0) return true;
            return sub.isInPastTrack(r, c) || sub.hasMineAt(r, c);
        });
    }

    handleMove({ direction }) {
        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        
        if (sub && sub.isValidMove(direction)) {
            if (this.socket) {
                console.log(`[ConnController] Emitting move: ${direction}`);
                this.socket.emit('move', direction);
            }
        } else {
            console.warn(`[ConnController] Attempted invalid move: ${direction}`);
        }
    }

    // --- Stealth Logic ---

    toggleStealth() {
        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();

        if (!sub) return;

        // Check if silence system is fully charged
        if (!sub.canFire('silence')) {
            console.warn('[ConnController] Silence system not fully charged!');
            // TODO: Push error flavor text to teletype when available
            window.dispatchEvent(new CustomEvent('director:ui_trigger', {
                detail: { action: 'log', message: '⚠️ SILENCE SYSTEM NOT CHARGED — Requires full charge (5/5) to activate.' }
            }));
            return;
        }

        this._stealthActive = !this._stealthActive;
        console.log(`[ConnController] Stealth mode: ${this._stealthActive ? 'ACTIVE' : 'INACTIVE'}`);

        // Update map intent
        if (this._stealthActive) {
            this.map?.execute('NAVIGATE', { stealth: true });
        } else {
            this.map?.execute('NAVIGATE', { stealth: false });
        }

        // Re-evaluate helm buttons (disabled during stealth)
        if (this.lastState) {
            this.updateHelmUI(this.lastState, sub);
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
        console.log(`[ConnController] Map Selection:`, data);

        const intent = data.intent || (this.map?.view?.mapView?.currentIntent);

        if (intent === 'TORPEDO') {
            this.socket.emit('launch_torpedo', { row: data.coords.row, col: data.coords.col });
        } else if (intent === 'MINE_LAY') {
            this.socket.emit('drop_mine', { row: data.coords.row, col: data.coords.col });
        } else if (intent === 'POSITION_SELECT') {
            this.socket.emit('choose_initial_position', { row: data.coords.row, column: data.coords.col });
        } else if (intent === 'NAVIGATE' && this._stealthActive) {
            // Stealth navigation: derive direction and distance from clicked tile
            const subController = this.features.get('submarine');
            const sub = subController?.getOwnship();
            if (!sub) return;

            const pos = sub.getPosition();
            const targetRow = data.coords.row;
            const targetCol = data.coords.col;

            // Determine direction and distance
            const dRow = targetRow - pos.row;
            const dCol = targetCol - pos.col;

            let direction = null;
            let spaces = 0;

            if (dRow === 0 && dCol > 0) { direction = 'E'; spaces = dCol; }
            else if (dRow === 0 && dCol < 0) { direction = 'W'; spaces = Math.abs(dCol); }
            else if (dCol === 0 && dRow > 0) { direction = 'S'; spaces = dRow; }
            else if (dCol === 0 && dRow < 0) { direction = 'N'; spaces = Math.abs(dRow); }

            if (direction && spaces > 0 && spaces <= 4) {
                console.log(`[ConnController] Stealth move: ${direction} x${spaces}`);
                this._stealthActive = false; // Deactivate after use
                this.socket.emit('silence', { direction, spaces });
            } else {
                console.warn('[ConnController] Invalid stealth target — must be in a cardinal line, 1-4 squares.');
            }
        }
    }
}
