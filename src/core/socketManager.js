/**
 * Socket Manager — Merged from existing and planned architecture.
 * Singleton managing WebSocket connections with EventEmitter support.
 * Supports binding to real sockets or mock Director instances.
 */

import { EventEmitter } from 'pixi.js';

class SocketManager extends EventEmitter {
    constructor() {
        super();
        // Standard initialization. Socket is null initially to allow binding in main.jsx
        this.socket = null;
        this.playerId = undefined;
        this.playerName = undefined;
        this.lastState = undefined;
    }

    /**
     * Bind to a socket (real or mock Director).
     * This replaces the constructor-based io() approach for flexibility.
     * @param {object} socket - Socket.IO client or Director mock
     */
    bindSocket(socket) {
        // Clean up old bindings if any
        if (this.socket) {
            this.socket.off('state');
            this.socket.off('GAME_STATE');
            this.socket.off('player_id');
            this.socket.off('disconnect');
        }

        this.socket = socket;

        // --- Inbound Event Proxying ---
        this.socket.on('state', (state) => this.updateLastState(state));
        this.socket.on('GAME_STATE', (state) => this.updateLastState(state));

        // Server assigns player ID
        this.socket.on('player_id', (id) => {
            this.playerId = id;
            this.emit('playerId', id);

            // Re-emit cached state so scenes can update now that playerId is known
            if (this.lastState) {
                setTimeout(() => this.emit('stateUpdate', this.lastState), 0);
            }
        });

        // Proxy Director/Debug commands
        this.socket.on('DIRECTOR_CMD', (data) => this.emit('DIRECTOR_CMD', data));

        // Proxy connection events
        this.socket.on('disconnect', () => {
            console.warn('[SocketManager] Socket disconnected');
            this.emit('disconnect');
        });

        // Initialize with cached state if available (e.g. from Director)
        if (this.socket.lastState) {
            this.lastState = this.socket.lastState;
            this.emit('stateUpdate', this.lastState);
        }
    }

    /**
     * Internal helper to update state cache and notify listeners.
     * @param {object} state 
     */
    updateLastState(state) {
        this.lastState = state;
        this.emit('stateUpdate', state);
    }

    // ─────────── Outbound Methods ───────────

    emit(event, ...args) {
        const internalEvents = ['stateUpdate', 'playerId', 'disconnect', 'DIRECTOR_CMD'];

        // If the event is one of our managed events, use standard EventEmitter.emit
        if (internalEvents.includes(event)) {
            super.emit(event, ...args);
            return;
        }

        // Otherwise, treat as a socket emission
        if (this.socket) {
            if (event === 'DIRECTOR_CMD') console.error('CRITICAL: DIRECTOR_CMD Leaking to socket!');
            this.socket.emit(event, ...args);
        } else {
            console.warn(`[SocketManager] Attempted to emit '${event}' without a socket!`);
        }
    }

    // Add the 'on' method if it's not already standard from EventEmitter
    // BaseController uses .on() to listen for events.
    // Actually PIXI.EventEmitter has .on().

    changeName(name) {
        this.emit('change_name', name);
    }

    selectRole(subId, role) {
        const roleAlias = (r) => {
            if (!r) return r;
            const key = String(r).toLowerCase();
            if (key === 'captain' || key === 'co') return 'co';
            if (key === '1stofficer' || key === 'xo' || key === 'firstofficer') return 'xo';
            if (key.includes('sonar')) return 'sonar';
            if (key === 'engineer' || key === 'eng' || key === 'radio') return 'eng';
            return r;
        };
        let subIndex = this.lastState?.submarines?.findIndex(sub => sub.id === subId);
        this.emit('select_role', { submarine: subIndex, role: roleAlias(role) });
    }

    leaveRole() { this.emit('leave_role'); }
    ready() { this.emit('ready'); }
    notReady() { this.emit('not_ready'); }
    pushButton(buttonData) { this.emit('button_pushed', buttonData); }
    chargeGauge(gauge) { this.emit('charge_gauge', gauge); }
    crossOffSystem(direction, slotId) {
        this.emit('cross_off_system', { direction, slotId });
    }
    readyInterrupt() { this.emit('ready_interrupt'); }
    requestPause() { this.emit('request_pause'); }
    submitSonarResponse(response) { this.emit('submit_sonar_response', response); }
    move(direction) { this.emit('move', direction); }
    chooseInitialPosition(row, column) {
        this.emit('choose_initial_position', { row, column });
    }
}

export const socketManager = new SocketManager();

// Expose to window for easy access
try {
    if (typeof window !== 'undefined') {
        window.socketManager = socketManager;
    }
} catch (e) {
    // ignore in non-browser contexts
}
