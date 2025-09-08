const socket = io(); // connect to server

// Canvas setup (same as before)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const rows = 15, cols = 15;
let cellWidth, cellHeight;
let subs = {}; // keyed by socketId

function drawGrid() {
  cellWidth = canvas.width / cols;
  cellHeight = canvas.height / rows;
  ctx.strokeStyle = "#555";

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellHeight);
    ctx.lineTo(canvas.width, r * cellHeight);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellWidth, 0);
    ctx.lineTo(c * cellWidth, canvas.height);
    ctx.stroke();
  }
}

function drawSubs() {
  Object.values(subs).forEach((sub) => {
    ctx.fillStyle = sub.color;
    ctx.fillRect(sub.col * cellWidth, sub.row * cellHeight, cellWidth, cellHeight);
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawSubs();
  requestAnimationFrame(render);
}
render();

// Button actions -> emit move
document.getElementById("moveN").addEventListener("click", () => socket.emit("move", "N"));
document.getElementById("moveS").addEventListener("click", () => socket.emit("move", "S"));
document.getElementById("moveE").addEventListener("click", () => socket.emit("move", "E"));
document.getElementById("moveW").addEventListener("click", () => socket.emit("move", "W"));

// Listen for state updates from server
socket.on("state", (gameState) => {
  subs = gameState.subs;
});
