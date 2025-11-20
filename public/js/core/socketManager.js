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

    // Server may emit either a plain id string or an object like { id, name }
    this.socket.on('player_id', (payload) => {
      let id = null;
      let name = undefined;
      if (typeof payload === 'string') {
        id = payload;
      } else if (payload && typeof payload === 'object') {
        id = payload.id;
        if (payload.name) name = payload.name;
      }

      if (id) {
        this.playerId = id;
      }
      if (name) {
        this.playerName = name;
      }

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

  selectRole(submarine, role) {
    this.socket.emit('select_role', { submarine, role });
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
