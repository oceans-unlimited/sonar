import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';

export function initializeServerState() {
  return {
    version: 0,
    currentState: "lobby",
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
    radio: null,
  }
}

export function createAndRunServer(serverState) {
  const app = express();
  // Serve a simple static index.html for testing
  app.use(express.static("public"));
  app.use('/node_modules', express.static('node_modules'));
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer);

  let playerNameCounter = 1;
  ioServer.on("connection", (socket) => {
    
    socket.on("disconnect", () => {
      serverState.players = serverState.players.filter(p => p.id !== socket.id);
      if (serverState.adminId && serverState.adminId === socket.id) {
        serverState.adminId = null;
      }
      console.log(`Player disconnected: ${socket.id}`);
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on("change_name", new_name => {
      if (serverState.currentState !== "lobby")
        return;

      serverState.players.find(p => p.id === socket.id).name = new_name;
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on("select_role", ({submarine, role}) => {
      if (serverState.currentState !== "lobby")
        return;

      if (
        0 <= submarine
        && submarine < serverState.submarines.length
        && !serverState.submarines[submarine][role]
      ) {
        // leave existing role
        serverState.submarines.forEach(submarine =>
          Object.keys(submarine).forEach(role => {
            if (submarine[role] === socket.id)
              submarine[role] = null;
          })
        );
        // go to new role
        serverState.submarines[submarine][role] = socket.id;
      }
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on("leave_role", () => {
      if (serverState.currentState !== "lobby")
        return;

      serverState.submarines.forEach(submarine =>
        Object.keys(submarine).forEach(role => {
          if (submarine[role] === socket.id)
            submarine[role] = null;
        })
      );

      serverState.version++;
      ioServer.emit("state", serverState);
    })

    socket.on("ready", () => {
      if (serverState.currentState !== "lobby")
        return;

      if (serverState.submarines.some(sub =>
        Object.keys(sub).some(role => sub[role] === socket.id)
      ) && !serverState.ready.includes(socket.id)) {
        serverState.ready.push(socket.id);
      }

      let allRolesAreReady = serverState.submarines.every(sub =>
        serverState.ready.includes(sub.co) &&
        serverState.ready.includes(sub.xo) &&
        serverState.ready.includes(sub.sonar) &&
        serverState.ready.includes(sub.radio)
      );
      if (allRolesAreReady && serverState.currentState === "lobby") {
        serverState.currentState = "game_beginning";
        serverState.version++;
        ioServer.emit("state", serverState);
        setTimeout(() => {
          serverState.currentState = "in_game";
          serverState.version++;
          ioServer.emit("state", serverState);

          // This is a placeholder until I implement actual game logic elsewhere.
          setTimeout(() => {
            ioServer.emit("game_won", Math.floor(Math.random() * 10) % 2);

            serverState.currentState = "lobby"
            serverState.version++;
            ioServer.emit("state", serverState);
          }, 120 * 1000);
        }, 3000);
      }

      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on("not_ready", () => {
      if (serverState.currentState !== "lobby")
        return;

      serverState.ready = serverState.ready.filter(id => id !== socket.id);
      serverState.version++;
      ioServer.emit("state", serverState);
    })

    serverState.players.push({
      id: socket.id,
      name: `Player ${playerNameCounter}`,
    });
    playerNameCounter++;

    if (!serverState.adminId) {
      serverState.adminId = socket.id;
    }
    
    socket.emit("player_id", socket.id);
    serverState.version++;
    ioServer.emit("state", serverState);

    console.log(`Player connected: ${socket.id}`);
  });

  httpServer.listen(3000, () => {
    console.log(`SocketIoServer running at http://localhost:3000`);
  });

  return httpServer;
}