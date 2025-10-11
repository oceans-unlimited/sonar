import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';

export function initializeServerState() {
  return { subs: {}};
}

export function createAndRunServer(serverState) {
  const app = express();
  // Serve a simple static index.html for testing
  app.use(express.static("public"));
  app.use('/node_modules', express.static('node_modules'));
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer);

  // Serve a simple static index.html for testing
  app.use(express.static("public"));

  const rows = 15, cols = 15;

  ioServer.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    //Spawn new sub at random location
    serverState.subs[socket.id] = {
      row: Math.floor(rows / 2),
      col: Math.floor(cols / 2),
      color: getRandomColor()
    };

    ioServer.emit("state", serverState);

    socket.on("move", (dir) => {
      let sub = serverState.subs[socket.id];
      if (!sub) return;

      if (dir == "N") sub.row = Math.max(0, sub.row - 1);
      if (dir == "S") sub.row = Math.min(rows - 1, sub.row + 1);
      if (dir == "E") sub.col = Math.min(cols - 1, sub.col + 1);
      if (dir == "W") sub.col = Math.max(0, sub.col - 1);

      console.log(`Move received: ${dir} (Player: ${socket.id})`);
      ioServer.emit("state", serverState);
    });

    socket.on("disconnect", () => {
      delete serverState.subs[socket.id];
      console.log(`Player disconnected: ${socket.id}`);
      ioServer.emit("state", serverState);
    });
  });

  function getRandomColor() {
    return `hsl(${Math.random() * 360}, 70%, 50%)`;
  }

  httpServer.listen(3000, () => {
    console.log(`SocketIoServer running at http://localhost:3000`);
  });

  return httpServer;
}