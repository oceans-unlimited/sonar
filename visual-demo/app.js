const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Grid settings
const rows = 15;
const cols = 15;
let cellWidth, cellHeight;

function drawGrid() {
  cellWidth = canvas.width / cols;
  cellHeight = canvas.height / rows;
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;

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

// Example submarine
let sub = { row: 7, col: 7 };

function drawSub() {
  ctx.fillStyle = "#ff5555";
  ctx.fillRect(sub.col * cellWidth, sub.row * cellHeight, cellWidth, cellHeight);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawSub();
  requestAnimationFrame(render);
}
render();

// Panel button interactions
document.getElementById("moveN").addEventListener("click", () => sub.row = Math.max(0, sub.row - 1));
document.getElementById("moveS").addEventListener("click", () => sub.row = Math.min(rows - 1, sub.row + 1));
document.getElementById("moveE").addEventListener("click", () => sub.col = Math.min(cols - 1, sub.col + 1));
document.getElementById("moveW").addEventListener("click", () => sub.col = Math.max(0, sub.col - 1));
