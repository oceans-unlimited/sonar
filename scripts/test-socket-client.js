// scripts/test-socket-client.js
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("connected:", socket.id);
});

socket.on("player_id", (p) => {
  console.log("player_id:", p);
});

socket.on("state", (s) => {
  console.log("state version:", s.version, "players:", (s.players||[]).map(p=>p.name));
});

socket.on("disconnect", () => {
  console.log("disconnected");
});
