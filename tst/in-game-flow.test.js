import { initializeServerState, createAndRunServer } from '../src/server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect } from 'vitest';

const SERVER_URL = "http://localhost:3001";
const DEFAULT_OPTIONS = {autoConnect: false};

let server = null;
let clients = [];

afterEach(() => {
  if (server) {
    server.close();
  }
  server = null;
  clients.forEach(c => c.close());
  clients = [];
});

test('Game starts, runs, and returns to lobby', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, 3001);

  let state = null;
  let ids = [null, null, null, null, null, null, null, null];
  function configureClient(client, index) {
    client.on("player_id", player_id => ids[index] = player_id);
    client.on("state", serverState => {
      state = serverState;
    });
  }
  
  for (let i = 0; i < 8; ++i) {
    clients[i] = io(SERVER_URL, DEFAULT_OPTIONS);
    configureClient(clients[i], i);
    clients[i].connect();
  }

  clients[0].emit("select_role", {submarine: 0, role: "co"});
  clients[1].emit("select_role", {submarine: 0, role: "xo"});
  clients[2].emit("select_role", {submarine: 0, role: "sonar"});
  clients[3].emit("select_role", {submarine: 0, role: "eng"});
  clients[4].emit("select_role", {submarine: 1, role: "co"});
  clients[5].emit("select_role", {submarine: 1, role: "xo"});
  clients[6].emit("select_role", {submarine: 1, role: "sonar"});
  clients[7].emit("select_role", {submarine: 1, role: "eng"});
  // make sure they're all selected
  await expect.poll(() => null, {timeout: 10000})
    .toSatisfy(() => {
      var sub0 = state.submarines[0];
      var sub1 = state.submarines[1];
      return sub0.co && sub0.xo && sub0.sonar && sub0.eng &&
        sub1.co && sub1.xo && sub1.sonar && sub1.eng;
    });

  for (let i = 0; i < 8; ++i) {
    clients[i].emit("ready");
  }

  await expect.poll(() => null, {timeout:10000, interval: 1000}).toSatisfy(() =>
    state.currentState === "game_beginning"
  );

  await expect.poll(() => null, {timeout: 10000}).toSatisfy(() =>
    state.currentState === "in_game"
  );

  // This is a placeholder until I implement actual game logic elsewhere.
  await expect.poll(() => null, {timeout: 11 * 1000}).toSatisfy(() =>
    state.currentState === "lobby"
  );
}, 30000);
