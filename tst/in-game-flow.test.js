import { initializeServerState, createAndRunServer } from '../src/server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect } from 'vitest';

const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;
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

test('Captains select starting position', async () => {
  // Setup.

  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);

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

  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready");
  }

  await expect.poll(() => null, {timeout:1000}).toSatisfy(() =>
    state.currentState === "game_beginning"
  );

  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() =>
    state.currentState === "in_game" && state.gameState === "choosingStartPositions"
  );

  // Actual test.

  // both captains select positions.
  clients[0].emit("choose_initial_position", {row: 0, column: 1});
  await expect.poll(() => null).toSatisfy(() =>
    state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'A')
    && state.submarines[0].row === 0
    && state.submarines[0].col === 1);
  clients[4].emit("choose_initial_position", {row: 2, column: 3});
  await expect.poll(() => null).toSatisfy(() =>
    state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'B')
    && state.submarines[1].row === 2
    && state.submarines[1].col === 3);
  // all players indicate ready.
  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready_to_resume_real_time_play");
    await expect.poll(() => null).toSatisfy(() =>
      state.gameStateData.choosingStartPositions.playerIdsReadyToContinue.some(playerId => playerId === ids[i]));
  }
  // game state becomes "realTimePlay".
  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() => state.gameState === "realTimePlay");
}, 10000);

test('Repeated, invalid, out-of-order actions do not affect choosing positions', async () => {
  // Setup.

  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);

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

  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready");
  }

  await expect.poll(() => null, {timeout:1000}).toSatisfy(() =>
    state.currentState === "game_beginning"
  );

  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() =>
    state.currentState === "in_game" && state.gameState === "choosingStartPositions"
  );

  // Actual test.

  // captain chooses twice; only first one takes effect.
  clients[0].emit("choose_initial_position", {row: 0, column: 1});
  await expect.poll(() => null).toSatisfy(() =>
    state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'A'));
  let versionBeforeNewAttempt = state.version;
  clients[0].emit("choose_initial_position", {row: 5, column: 4});
  await (expect.poll(() => null).toSatisfy(() =>
    state.version > versionBeforeNewAttempt && state.submarines[0].row === 0 && state.submarines[0].col === 1
  ));

  // captain chooses invalid position; they are not added to the list of subs with chosen positions.
  let versionBeforeBadPosition = state.version;
  clients[4].emit("choose_initial_position", {row: 2, column: 2});
  await expect.poll(() => null).toSatisfy(() =>
    state.version > versionBeforeBadPosition
    && !state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'B')
  );

  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready_to_resume_real_time_play");
    await expect.poll(() => null).toSatisfy(() =>
      state.gameStateData.choosingStartPositions.playerIdsReadyToContinue.some(playerId => playerId === ids[i]));
  }

  // game state is still "choosingStartPositions".
  await expect.poll(() => null).toSatisfy(() => state.gameState === "choosingStartPositions");

  // now captain chooses valid position, and state transition occurs.
  clients[4].emit("choose_initial_position", {row: 3, column: 4});
  await expect.poll(() => null).toSatisfy(() =>
    state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'B'));
  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() => state.gameState === "realTimePlay");
}, 10000);
