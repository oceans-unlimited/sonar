import { createAndRunServer } from '../src/server.lib.js';
import { LogicalServer } from '../src/logical-server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect, assert } from 'vitest';

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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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

test('Second player has incrementing number in name.', async() => {
  const server = new LogicalServer(); 
  server.addPlayer('first');
  server.addPlayer('second');
  expect(server.state.adminId).toBe('first');
  expect(server.state.players[0].id).toBe('first');
  expect(server.state.players[0].name).toBe(`Player 1`);
  expect(server.state.players[1].id).toBe('second');
  expect(server.state.players[1].name).toBe(`Player 2`);
});

test('Player changes name.', async () => {
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();
  server = createAndRunServer(logicalServer, PORT);
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
  const logicalServer = new LogicalServer();

  logicalServer.addPlayer('sub0co');
  logicalServer.addPlayer('sub0xo');
  logicalServer.addPlayer('sub0sonar');
  logicalServer.addPlayer('sub0eng');
  logicalServer.addPlayer('sub1co');
  logicalServer.addPlayer('sub1xo');
  logicalServer.addPlayer('sub1sonar');
  logicalServer.addPlayer('sub1eng');

  logicalServer.selectRole('sub0co', 0, 'co');
  logicalServer.selectRole('sub0xo', 0, 'xo');
  logicalServer.selectRole('sub0sonar', 0, 'sonar');
  logicalServer.selectRole('sub0eng', 0, 'eng');
  logicalServer.selectRole('sub1co', 1, 'co');
  logicalServer.selectRole('sub1xo', 1, 'xo');
  logicalServer.selectRole('sub1sonar', 1, 'sonar');
  logicalServer.selectRole('sub1eng', 1, 'eng');

  let allRolesReady = false;
  let gameStarted = false;

  let allRolesReadyCallback = () => allRolesReady = true;
  let gameStartedCallback = () => gameStarted = true;

  logicalServer.ready('sub0co', allRolesReadyCallback, gameStartedCallback);
  logicalServer.ready('sub0xo', allRolesReadyCallback, gameStartedCallback);
  logicalServer.ready('sub0sonar', allRolesReadyCallback, gameStartedCallback);
  logicalServer.ready('sub0eng', allRolesReadyCallback, gameStartedCallback);
  logicalServer.ready('sub1co', allRolesReadyCallback, gameStartedCallback);
  logicalServer.ready('sub1xo', allRolesReadyCallback, gameStartedCallback);
  logicalServer.ready('sub1sonar', allRolesReadyCallback, gameStartedCallback);
  assert(!allRolesReady);
  assert(!gameStarted);
  logicalServer.ready('sub1eng', allRolesReadyCallback, gameStartedCallback);
  assert(allRolesReady);
  assert(logicalServer.state.currentState === "game_beginning");
  assert(!gameStarted);

  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() =>
    logicalServer.state.currentState === "in_game"
    && gameStarted
  );
});
