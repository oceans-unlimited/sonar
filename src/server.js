// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve a simple static index.html for testing
app.use(express.static("public"));

const rows = 15, cols = 15;
let subs = {};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  //Spawn new sub at random location
  subs[socket.id] = {
    row: Math.floor(rows / 2),
    col: Math.floor(cols / 2),
    color: getRandomColor()
  };

  io.emit("state", { subs });

  socket.on("move", (dir) => {
    let sub = subs[socket.id];
    if (!sub) return;

    if (dir == "N") sub.row = Math.max(0, sub.row - 1);
    if (dir == "S") sub.row = Math.min(rows - 1, sub.row + 1);
    if (dir == "E") sub.col = Math.min(cols - 1, sub.col + 1);
    if (dir == "W") sub.col = Math.max(0, sub.col - 1);

    console.log(`Move received: ${dir}`);
    io.emit("state", { subs });
  });

  socket.on("disconnect", () => {
    delete subs[socket.id];
    console.log(`Player disconnected: ${socket.id}`);
    io.emit("state", { subs });
  });
});

function getRandomColor() {
  return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

server.listen(3000, () => {
  console.log(`Server running at http://localhost:3000`);
});
