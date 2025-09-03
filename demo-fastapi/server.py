from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

app = FastAPI()

# Serve static files (our client HTML)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Keep track of connected clients
clients = []

@app.get("/")
async def get():
    with open("static/index.html") as f:
        return HTMLResponse(f.read())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all clients
            for client in clients:
                await client.send_text(f"Player says: {data}")
    except WebSocketDisconnect:
        clients.remove(websocket)
