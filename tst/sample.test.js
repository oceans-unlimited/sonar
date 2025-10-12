import { initializeServerState, createAndRunServer } from '../src/server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect } from 'vitest';

let server = null;

afterEach(() => {
  if (server)
    server.close();
  server = null;
});

test('First player connects.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState);
  const client = io("http://localhost:3000");
  
  let id = null;
  let state = null;
  client.on("player_id", player_id => id = player_id);
  client.on("state", serverState => {
    state = serverState;
  });
  await expect
    .poll(() => [id, state], { timeout: 1000 })
    .toSatisfy(([id, state]) => id && state);
  expect(state.adminId).toBe(id);
  expect(state.players[0].id).toBe(id);
  expect(state.players[0].name).toBe(`Player 1`);
});
