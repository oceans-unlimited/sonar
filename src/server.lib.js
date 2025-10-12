import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';

export function initializeServerState() {
  return {
    players: [],
    adminId: null,
  };
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
    console.log(`Player connected: ${socket.id}`);

    serverState.players.push({
      id: socket.id,
      name: `Player ${playerNameCounter}`,
    });
    playerNameCounter++;

    ioServer.emit("player_id", socket.id);
    if (!serverState.adminId) {
      serverState.adminId = socket.id;
    }
    ioServer.emit("state", serverState);

    socket.on("disconnect", () => {
      serverState.players = serverState.players.filter(p => p.id !== socket.id);
      if (serverState.adminId && serverState.adminId === socket.id) {
        serverState.adminId = null;
      }
      console.log(`Player disconnected: ${socket.id}`);
      ioServer.emit("state", serverState);
    });
  });

  httpServer.listen(3000, () => {
    console.log(`SocketIoServer running at http://localhost:3000`);
  });

  return httpServer;
}