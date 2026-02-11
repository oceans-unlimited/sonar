/**
 * Socket Manager — Merged from existing and planned architecture.
 * Singleton managing WebSocket connections with EventEmitter support.
 * Supports binding to real sockets or mock Director instances.
 */

import { EventEmitter } from 'pixi.js';

class SocketManager extends EventEmitter {
    constructor() {
        super();
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
            this.socket.off('player_id');
            this.socket.off('disconnect');
        }

        this.socket = socket;

        // --- Inbound Event Proxying ---
        this.socket.on('state', (state) => {
            this.lastState = state;
            this.emit('stateUpdate', state);
        });

        this.socket.on('player_id', (id) => {
            this.playerId = id;
            this.emit('playerId', id);

            // Re-emit cached state so scenes can update now that playerId is known
            if (this.lastState) {
                setTimeout(() => this.emit('stateUpdate', this.lastState), 0);
            }
        });

        this.socket.on('disconnect', () => {
            this.emit('disconnect');
        });

        // Director command passthrough
        if (socket.on) {
            this.socket.on('DIRECTOR_CMD', (cmd) => {
                this.emit('DIRECTOR_CMD', cmd);
            });
        }
    }

    // ─────────── Outbound Methods ───────────

    changeName(name) {
        this.socket?.emit('change_name', name);
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
        this.socket?.emit('select_role', { submarine: subIndex, role: roleAlias(role) });
    }

    leaveRole() {
        this.socket?.emit('leave_role');
    }

    ready() {
        this.socket?.emit('ready');
    }

    notReady() {
        this.socket?.emit('not_ready');
    }

    pushButton(buttonData) {
        this.socket?.emit('button_pushed', buttonData);
    }

    chargeGauge(gauge) {
        this.socket?.emit('charge_gauge', gauge);
    }

    crossOffSystem(direction, slotId) {
        this.socket?.emit('cross_off_system', { direction, slotId });
    }

    readyInterrupt() {
        this.socket?.emit('ready_interrupt');
    }

    requestPause() {
        this.socket?.emit('request_pause');
    }

    submitSonarResponse(response) {
        this.socket?.emit('submit_sonar_response', response);
    }

    move(direction) {
        this.socket?.emit('move', direction);
    }

    chooseInitialPosition(row, column) {
        this.socket?.emit('choose_initial_position', { row, column });
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
