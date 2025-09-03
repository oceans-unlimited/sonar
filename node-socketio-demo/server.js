// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve a simple static index.html for testing
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Example: listen for a "move" message from client
  socket.on("move", (direction) => {
    console.log(`Move received: ${direction}`);
    // Broadcast move to all connected clients
    io.emit("update", { player: socket.id, move: direction });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
