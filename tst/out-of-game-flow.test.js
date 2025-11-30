import { initializeServerState, createAndRunServer } from '../src/server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect } from 'vitest';

const PORT = 3000;
const SERVER_URL = `http://localhost:${PORT}`;
const DEFAULT_OPTIONS = {autoConnect: false};

let server = null;

afterEach(() => {
  if (server)
    server.close();
  server = null;
});

test('First player connects.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);
  
  let id = null;
  let state = null;
  client.on("player_id", player_id => id = player_id);
  client.on("state", serverState => {
    state = serverState;
  });

  client.connect();

  await expect
    .poll(() => [id, state], { timeout: 1000 })
    .toSatisfy(([id, state]) => id && state);
  expect(state.adminId).toBe(id);
  expect(state.players[0].id).toBe(id);
  expect(state.players[0].name).toBe(`Player 1`);
});

test('Second player connects.', async() => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const firstClient = io(SERVER_URL, DEFAULT_OPTIONS);
  const secondClient = io(SERVER_URL, DEFAULT_OPTIONS);
  
  let ids = [];
  let latest_state = null;

  function configureClient(client) {
    client.on("player_id", player_id => ids.push(player_id));
    client.on("state", state => {
      latest_state = state;
    });
  }

  configureClient(firstClient);
  configureClient(secondClient);

  firstClient.connect();
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => latest_state);
  secondClient.connect();
  await expect
    .poll(() => null, { timeout: 1000 })
    .toSatisfy(() =>
      ids.length == 2 && latest_state.players.length == 2);
  expect(latest_state.adminId).toBe(ids[0]);
  expect(latest_state.players[0].id).toBe(ids[0]);
  expect(latest_state.players[0].name).toBe(`Player 1`);
  expect(latest_state.players[1].id).toBe(ids[1]);
  expect(latest_state.players[1].name).toBe(`Player 2`);
});

test('Player changes name.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  client.on("state", remoteState => state = remoteState);
  
  client.connect();
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => state);
  client.emit("change_name", "My Custom Name #(*$&*(&$");
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() => state.players[0].name === "My Custom Name #(*$&*(&$");
});

test('Player selects role.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => state);
  client.emit("select_role", {submarine: 0, role: "co"});
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() => clientId && state.submarines[0].co === clientId);
});

test('Player selects different role than they already selected.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => state && clientId);
  client.emit("select_role", {submarine: 0, role: "co"});
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() => state.submarines[0].co === clientId);
  client.emit("select_role", {submarine: 0, role: "xo"});
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() =>
      !state.submarines[0].co
      && state.submarines[0].xo === clientId);
});

test('Player selects same role as they already selected.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => state && clientId);
  client.emit("select_role", {submarine: 0, role: "co"});
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() => state.submarines[0].co === clientId);
  let previousStateVersion = state.version;
  client.emit("select_role", {submarine: 0, role: "co"});
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() =>
      state.submarines[0].co === clientId
      && state.version > previousStateVersion
    );
});

test('Player selects role that is already filled by another player.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const firstClient = io(SERVER_URL, DEFAULT_OPTIONS);
  const secondClient = io(SERVER_URL, DEFAULT_OPTIONS);
  
  let ids = [null, null];
  let state = null;

  function configureClient(client, index) {
    client.on("player_id", player_id => ids[index] = player_id);
    client.on("state", serverState => {
      state = serverState;
    });
  }
  configureClient(firstClient, 0);
  configureClient(secondClient, 1);

  firstClient.connect();
  secondClient.connect();
  firstClient.emit('select_role', {submarine: 1, role: "xo"});
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => ids[0] && state.submarines[1].xo === ids[0]);
  let lastStateVersion = state.version;
  secondClient.emit('select_role', {submarine: 1, role: "xo"})
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    state.submarines[1].xo === ids[0]
    && state.version > lastStateVersion
  );
});

test('Player leaves role.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  client.emit("select_role", {submarine: 0, role: "co"});
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() => clientId && state.submarines[0].co === clientId);
  client.emit("leave_role");
  await expect.poll(() => null, {timeout: 1000})
    .toSatisfy(() => !state.submarines[0].co);
});

test('Player is ready to start before they selected a role.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() => state);
  let previousStateVersion = state.version;
  client.emit("ready");
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    state.ready.length === 0
    && state.version > previousStateVersion
  );
});

test('Player is ready to start after they selected a role.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  client.emit("select_role", {submarine: 0, role: "co"});
  client.emit("ready");
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    state.ready.some(id => id === clientId)
  );
});

test('Player is ready, then is ready again.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);
  
  client.connect();
  client.emit("select_role", {submarine: 0, role: "co"});
  client.emit("ready");
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    state.ready.some(id => id === clientId)
  );
  let previousStateVersion = state.version;
  client.emit("ready");
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    state.version > previousStateVersion &&
    state.ready.filter(id => id === clientId).length === 1
  );
});

test('Player is not ready.', async () => {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);
  const client = io(SERVER_URL, DEFAULT_OPTIONS);

  let state = null;
  let clientId = null;
  client.on("state", remoteState => state = remoteState);
  client.on("player_id", player_id => clientId = player_id);

  client.connect();
  client.emit("select_role", {submarine: 0, role: "co"});
  client.emit("ready");
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    state.ready.includes(clientId)
  );
  client.emit("not_ready");
  await expect.poll(() => null, {timeout: 1000}).toSatisfy(() =>
    !state.ready.includes(clientId)
  );
});

test('All roles are ready to start the game.', async () => {
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
  
  let clients = []
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
  await expect.poll(() => null, {timeout: 5000})
    .toSatisfy(() => {
      var sub0 = state.submarines[0];
      var sub1 = state.submarines[1];
      return sub0.co && sub0.xo && sub0.sonar && sub0.eng &&
        sub1.co && sub1.xo && sub1.sonar && sub1.eng;
    });

  for (let i = 0; i < 8; ++i) {
    clients[i].emit("ready");
  }

  await expect.poll(() => null, {timeout:1000}).toSatisfy(() =>
    state.currentState === "game_beginning"
  );

  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() =>
    state.currentState === "in_game"
  );
});
