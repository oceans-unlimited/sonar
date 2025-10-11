import { initializeServerState, createAndRunServer } from '../src/server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect } from 'vitest';

let server = null;

afterEach(() => {
  if (server)
    server.close();
  server = null;
});

test('asserts true', async () => {
  const state = initializeServerState();
  server = createAndRunServer(state);
  const socket = io("http://localhost:3000");

  let row = -1;
  socket.on("state", state => {
    row = Object.values(state.subs)[0].row;
  });
  socket.emit("move", "N");
  await expect.poll(() => row, { timeout: 1000 }).greaterThan(-1);
});
