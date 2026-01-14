// public/js/core/socketManager.js


import { EventEmitter } from 'pixi.js';

class SocketManager extends EventEmitter {
  constructor() {
    super();
    this.socket = io();

    // Will be filled once the server assigns an id to this client
    this.playerId = undefined;
    this.playerName = undefined;
    // Cache last state so we can re-emit it after player_id arrives
    this.lastState = undefined;

    this.socket.on('state', (state) => {
      this.lastState = state;
      this.emit('stateUpdate', state);
    });

    // Server emits a plain id string
    this.socket.on('player_id', (id) => {
      this.playerId = id;

      // Keep backward-compatible event emission
      this.emit('playerId', id);

      // If we already have a cached state, re-emit it so scenes can update now that
      // playerId is known (avoids race where initial 'state' arrives before 'player_id').
      if (this.lastState) {
        // emit async to avoid re-entrancy issues
        setTimeout(() => this.emit('stateUpdate', this.lastState), 0);
      }
    });
  }

  changeName(name) {
    this.socket.emit('change_name', name);
  }

  selectRole(subId, role) {
    // Map client-facing role names to server-side submarine keys
    const roleAlias = (r) => {
      if (!r) return r;
      const key = String(r).toLowerCase();
      if (key === 'captain' || key === 'co') return 'co';
      if (key === '1stofficer' || key === 'xo' || key === 'firstofficer') return 'xo';
      if (key.includes('sonar')) return 'sonar';
      if (key === 'engineer' || key === 'eng' || key === 'radio') return 'eng';
      return r;
    };
    let subIndex = this.lastState.submarines.findIndex(sub => sub.id === subId);
    this.socket.emit('select_role', { submarine: subIndex, role: roleAlias(role) });
  }

  leaveRole() {
    this.socket.emit('leave_role');
  }

  ready() {
    this.socket.emit('ready');
  }

  notReady() {
    this.socket.emit('not_ready');
  }

  pushButton(buttonData) {
    this.socket.emit('button_pushed', buttonData);
  }

  chargeGauge(gauge) {
    this.socket.emit('charge_gauge', gauge);
  }

  crossOffSystem(direction, slotId) {
    this.socket.emit('cross_off_system', { direction, slotId });
  }

  readyInterrupt() {
    this.socket.emit('ready_interrupt');
  }

  requestPause() {
    this.socket.emit('request_pause');
  }

  submitSonarResponse(response) {
    this.socket.emit('submit_sonar_response', response);
  }

  move(direction) {
    this.socket.emit('move', direction);
  }

  chooseInitialPosition(row, column) {
    this.socket.emit('choose_initial_position', { row, column });
  }
}



export const socketManager = new SocketManager();

// Expose to window for easy access from scenes that use DOM-created inputs
try {
  if (typeof window !== 'undefined') {
    window.socketManager = socketManager;
  }
} catch (e) {
  // ignore in non-browser contexts
}
