import { GlobalPhases, InterruptTypes } from '../src/constants.js';
import { LogicalServer } from '../src/logical-server.lib.js';
import { test, expect, assert } from 'vitest';

test('First player connects.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("player id");

  assert(logicalServer.state.adminId === "player id");
  assert(logicalServer.state.players[0].id === "player id");
  assert(logicalServer.state.players[0].name === `Player 1`);
});

test('Second player has incrementing number in name.', async() => {
  const server = new LogicalServer(); 
  server.addPlayer('first');
  server.addPlayer('second');
  assert(server.state.adminId === 'first');
  assert(server.state.players[0].id === 'first');
  assert(server.state.players[0].name === `Player 1`);
  assert(server.state.players[1].id === 'second');
  assert(server.state.players[1].name === `Player 2`);
});

test('Player changes name.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("player id");
  logicalServer.changeName("player id", "My Custom Name #(*$&*(&$");
  assert (logicalServer.state.players[0].name === "My Custom Name #(*$&*(&$");
});

test('Player selects role.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("player id");
  logicalServer.selectRole("player id", 0, "co");
  assert(logicalServer.state.submarines[0].co === "player id");
});

test('Player selects different role than they already selected.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("id");

  logicalServer.selectRole("id", 0, "co");
  assert(logicalServer.state.submarines[0].co === "id");
  logicalServer.selectRole("id", 0, "xo");
  assert(logicalServer.state.submarines[0].co === null);
  assert(logicalServer.state.submarines[0].xo === "id");
});

test('Player selects same role as they already selected.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("id");

  logicalServer.selectRole("id", 0, "co");
  assert(logicalServer.state.submarines[0].co === "id");
  let previousVersion = logicalServer.state.version;
  logicalServer.selectRole("id", 0, "co");
  assert(logicalServer.state.submarines[0].co === "id");
  assert(logicalServer.state.version > previousVersion);
});

test('Player selects role that is already filled by another player.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("first");
  logicalServer.addPlayer("second");
  logicalServer.selectRole("first", 1, "xo");
  assert(logicalServer.state.submarines[1].xo === "first");
  let lastStateVersion = logicalServer.state.version;
  logicalServer.selectRole("second", 1, "xo");
  assert(logicalServer.state.submarines[1].xo === "first");
  assert(logicalServer.state.version > lastStateVersion);
});

test('Player leaves role.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.selectRole("id");
  logicalServer.selectRole("id", 0, "co");
  assert(logicalServer.state.submarines[0].co === "id");
  logicalServer.leaveRole("id");
  assert(logicalServer.state.submarines[0].co === null);
});

test('Player is ready to start before they selected a role.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("id");
  let previousStateVersion = logicalServer.state.version;
  logicalServer.ready("id");
  assert(logicalServer.state.ready.length === 0);
  assert(logicalServer.state.version > previousStateVersion);
});

test('Player is ready to start after they selected a role.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("id");
  logicalServer.selectRole("id", 0, "co");
  logicalServer.ready("id");
  assert(logicalServer.state.ready.includes("id"));
});

test('Player is ready, then is ready again.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("id");
  logicalServer.selectRole("id", 0, "co");
  logicalServer.ready("id");
  assert(logicalServer.state.ready.includes("id"));
  let previousStateVersion = logicalServer.state.version;
  logicalServer.ready("id");
  assert(logicalServer.state.version > previousStateVersion);
  assert(logicalServer.state.ready.filter(id => id === "id").length === 1);
});

test('Player is not ready.', () => {
  const logicalServer = new LogicalServer();
  logicalServer.addPlayer("id");
  logicalServer.selectRole("id", 0, "co");
  logicalServer.ready("id");
  assert(logicalServer.state.ready.includes("id"));
  logicalServer.notReady("id");
  assert(!logicalServer.state.ready.includes("id"));
});

test('All roles are ready to start the game.', () => {
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

  logicalServer.ready('sub0co');
  logicalServer.ready('sub0xo');
  logicalServer.ready('sub0sonar');
  logicalServer.ready('sub0eng');
  logicalServer.ready('sub1co');
  logicalServer.ready('sub1xo');
  logicalServer.ready('sub1sonar');
  assert(logicalServer.state.phase === GlobalPhases.LOBBY);
  logicalServer.ready('sub1eng');
  assert(logicalServer.state.phase === GlobalPhases.GAME_BEGINNING);
  logicalServer.startGame();
  assert(logicalServer.state.phase === GlobalPhases.INTERRUPT);
  assert(logicalServer.state.activeInterrupt && logicalServer.state.activeInterrupt.type === InterruptTypes.START_POSITIONS);
});
