import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { EngineLayoutGenerator } from './engineLayout.js';

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export function initializeServerState() {
  return {
    version: 0,
    currentState: "lobby",
    // persistent counter for assigning Player-01, Player-02 names
    playerNameCounter: 1,
    players: [],
    adminId: null,
    submarines: [createSubmarine(), createSubmarine()],
    ready: [],
  };
}

function createSubmarine() {
  return {
    co: null,
    xo: null,
    sonar: null,
    eng: null,
  }
}

export function createAndRunServer(serverState) {
  const app = express();
  // Serve a simple static index.html for testing
  app.use(express.static("public"));
  app.use('/node_modules', express.static('node_modules'));
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer);

  ioServer.on("connection", (socket) => {
    
    socket.on("disconnect", () => {
      log(`Player disconnected: ${socket.id}`);
      // Remove player record
      serverState.players = serverState.players.filter(p => p.id !== socket.id);
      // Remove from ready list
      serverState.ready = serverState.ready.filter(id => id !== socket.id);
      // Vacate any roles held by this player
      serverState.submarines.forEach(submarine =>
        Object.keys(submarine).forEach(role => {
          if (submarine[role] === socket.id) submarine[role] = null;
        })
      );
      if (serverState.adminId && serverState.adminId === socket.id) {
        serverState.adminId = null;
      }
      serverState.version++;
      log('Broadcasting state update after disconnect');
      ioServer.emit("state", serverState);
    });

    socket.on("change_name", new_name => {
      log(`Player ${socket.id} changed name to ${new_name}`);
      if (serverState.currentState !== "lobby") return;

      const player = serverState.players.find(p => p.id === socket.id);
      if (!player) return;
      player.name = new_name;
      serverState.version++;
      log('Broadcasting state update after name change');
      ioServer.emit("state", serverState);
    });

    // Map client-facing role names to internal submarine keys
    const roleAlias = (r) => {
      if (!r) return r;
      const key = String(r).toLowerCase();
      if (key === 'captain' || key === 'co') return 'co';
      if (key === '1stofficer' || key === 'xo' || key === 'firstofficer') return 'xo';
      if (key.includes('sonar')) return 'sonar';
      if (key === 'engineer' || key === 'eng' || key === 'radio') return 'eng';
      return r;
    };

    socket.on("select_role", ({submarine, role}) => {
      // Accept either numeric index or letter identifiers 'A'/'B' from clients.
      let subIndex = submarine;
      if (typeof submarine === 'string') {
        const s = submarine.toUpperCase();
        if (s === 'A') subIndex = 0;
        else if (s === 'B') subIndex = 1;
        else if (!isNaN(Number(s))) subIndex = Number(s);
      }

      const internalRole = roleAlias(role);
      log(`Player ${socket.id} selected role ${role} (internal: ${internalRole}) on submarine ${submarine}`);
      if (serverState.currentState !== "lobby") return;

      if (
        typeof subIndex === 'number' &&
        0 <= subIndex &&
        subIndex < serverState.submarines.length &&
        internalRole &&
        !serverState.submarines[subIndex][internalRole]
      ) {
        // leave existing role
        serverState.submarines.forEach(submarineObj =>
          Object.keys(submarineObj).forEach(rk => {
            if (submarineObj[rk] === socket.id) submarineObj[rk] = null;
          })
        );
        // go to new role
        serverState.submarines[subIndex][internalRole] = socket.id;

        // un-ready the player
        serverState.ready = serverState.ready.filter(id => id !== socket.id);
      }
      serverState.version++;
      log('Broadcasting state update after role selection');
      ioServer.emit("state", serverState);
    });

    socket.on("leave_role", () => {
      log(`Player ${socket.id} left their role`);
      if (serverState.currentState !== "lobby") return;

      serverState.submarines.forEach(submarine =>
        Object.keys(submarine).forEach(role => {
          if (submarine[role] === socket.id) submarine[role] = null;
        })
      );

      serverState.ready = serverState.ready.filter(id => id !== socket.id);

      serverState.version++;
      log('Broadcasting state update after leaving role');
      ioServer.emit("state", serverState);
    })

    socket.on("ready", () => {
      log(`Player ${socket.id} is ready`);
      if (serverState.currentState !== "lobby") return;

      if (serverState.submarines.some(sub =>
        Object.keys(sub).some(role => sub[role] === socket.id)
      ) && !serverState.ready.includes(socket.id)) {
        serverState.ready.push(socket.id);
      }

      const allRolesAreReady = serverState.submarines.every(sub =>
        ['co','xo','sonar','eng'].every(rk => serverState.ready.includes(sub[rk]))
      );
      if (allRolesAreReady && serverState.currentState === "lobby") {
        log('All roles are ready, starting game');
        serverState.currentState = "game_beginning";
        serverState.version++;
        log('Broadcasting state update: game beginning');
        ioServer.emit("state", serverState);
        setTimeout(() => {
          log('Transitioning to in_game state');
          serverState.currentState = "in_game";
          const engineLayoutGenerator = new EngineLayoutGenerator();
          serverState.submarines.forEach(sub => {
            sub.engineLayout = engineLayoutGenerator.generateLayout();
          });
          serverState.version++;
          log('Broadcasting state update: in_game');
          ioServer.emit("state", serverState);

          // This is a placeholder until I implement actual game logic elsewhere.
          setTimeout(() => {
            const winner = Math.floor(Math.random() * 10) % 2;
            log(`Game over, winner is submarine ${winner}`);
            ioServer.emit("game_won", winner);

            log('Returning to lobby');
            serverState.currentState = "lobby";
            serverState.ready = [];
            serverState.version++;
            log('Broadcasting state update: lobby');
            ioServer.emit("state", serverState);
          }, 120 * 1000);
        }, 3000);
      }

      serverState.version++;
      log('Broadcasting state update after ready');
      ioServer.emit("state", serverState);
    });

    socket.on("not_ready", () => {
      log(`Player ${socket.id} is not ready`);
      if (serverState.currentState !== "lobby")
        return;

      serverState.ready = serverState.ready.filter(id => id !== socket.id);
      serverState.version++;
      log('Broadcasting state update after not ready');
      ioServer.emit("state", serverState);
    })

    // Assign the smallest available slot from 1..8 for friendly names
    const maxSlots = 8;
    const usedSlots = new Set(serverState.players.map(p => p.playerNumber).filter(n => typeof n === 'number'));
    let assignedSlot = null;
    for (let i = 1; i <= maxSlots; i++) {
      if (!usedSlots.has(i)) { assignedSlot = i; break; }
    }
    // If all 1..8 are used, assign the next numeric slot after the current max
    if (assignedSlot === null) {
      const maxUsed = serverState.players.reduce((m, p) => Math.max(m, p.playerNumber || 0), 0);
      assignedSlot = maxUsed + 1;
    }

    const playerName = `Player-${String(assignedSlot).padStart(2,'0')}`;
    serverState.players.push({
      id: socket.id,
      name: playerName,
      playerNumber: assignedSlot,
      connectionOrder: Date.now(),
      ready: false,
    });

    if (!serverState.adminId) serverState.adminId = socket.id;

    log(`Player connected: ${socket.id} (${playerName})`);
    // Emit both id and assigned name to the connecting client
    socket.emit("player_id", { id: socket.id, name: playerName });
    serverState.version++;
    log('Broadcasting state update after new connection');
    ioServer.emit("state", serverState);

    console.log(`Player connected: ${socket.id}`);
  });

  httpServer.listen(3000, () => {
    console.log(`SocketIoServer running at http://localhost:3000`);
  });

  return httpServer;
}