import { initializeServerState, createAndRunServer } from '../src/server.lib.js';
import { io } from 'socket.io-client';
import { test, afterEach, expect, assert } from 'vitest';

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

async function startGame() {
  const serverState = initializeServerState();
  server = createAndRunServer(serverState, PORT);

  let testData = {
    state: null,
    ids: [null, null, null, null, null, null, null, null],
    subs: [{co: null, xo: null, sonar: null, eng: null},
           {co: null, xo: null, sonar: null, eng: null},],
  }

  function configureClient(client, index) {
    client.on("player_id", player_id => testData.ids[index] = player_id);
    client.on("state", serverState => {
      testData.state = serverState;
    });
  }
  
  for (let i = 0; i < 8; ++i) {
    clients[i] = io(SERVER_URL, DEFAULT_OPTIONS);
    configureClient(clients[i], i);
    clients[i].connect();
  }

  testData.subs[0].co = clients[0];
  testData.subs[0].xo = clients[1];
  testData.subs[0].sonar = clients[2];
  testData.subs[0].eng = clients[3];
  testData.subs[1].co = clients[4];
  testData.subs[1].xo = clients[5];
  testData.subs[1].sonar = clients[6];
  testData.subs[1].eng = clients[7];

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
      var sub0 = testData.state.submarines[0];
      var sub1 = testData.state.submarines[1];
      return sub0.co && sub0.xo && sub0.sonar && sub0.eng &&
        sub1.co && sub1.xo && sub1.sonar && sub1.eng;
    });

  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready");
  }

  await expect.poll(() => null, {timeout:1000}).toSatisfy(() =>
    testData.state.currentState === "game_beginning"
  );

  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() =>
    testData.state.currentState === "in_game" && testData.state.gameState === "choosingStartPositions"
  );

  return testData;
}

async function chooseInitialPositions(testData, sub0Position, sub1Position) {
  testData.subs[0].co.emit("choose_initial_position", sub0Position);
  testData.subs[1].co.emit("choose_initial_position", sub1Position);

  clients.forEach(c => c.emit("ready_to_resume_real_time_play"));

  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() =>
    testData.state.gameState === 'realTimePlay'
  );
}

async function move(testData, subIndex, direction, gaugeToIncrement, slotIdToCrossOff) {
  let gaugeBeforeMoveNext = testData.state.submarines[subIndex].actionGauges[gaugeToIncrement];
  assert(gaugeBeforeMoveNext === 0 || gaugeBeforeMoveNext > 0);
  testData.subs[subIndex].co.emit("move", direction);
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[subIndex].submarineState === 'doingPostMovementActions'
  );
  let versionBeforePostMoveActions = testData.state.version;
  testData.subs[subIndex].xo.emit("charge_gauge", gaugeToIncrement);
  testData.subs[subIndex].eng.emit("cross_off_system", {direction: direction, slotId: slotIdToCrossOff});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforePostMoveActions &&
    testData.state.submarines[subIndex].submarineState === 'waitingForAction'
  );
}

test('Captains select starting position', async () => {
  let testData = await startGame();

  // both captains select positions.
  clients[0].emit("choose_initial_position", {row: 0, column: 1});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'A')
    && testData.state.submarines[0].row === 0
    && testData.state.submarines[0].col === 1);
  clients[4].emit("choose_initial_position", {row: 2, column: 3});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'B')
    && testData.state.submarines[1].row === 2
    && testData.state.submarines[1].col === 3);
  // all players indicate ready.
  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready_to_resume_real_time_play");
    await expect.poll(() => null).toSatisfy(() =>
      testData.state.gameStateData.choosingStartPositions.playerIdsReadyToContinue.some(playerId => playerId === testData.ids[i]));
  }
  // game state becomes "realTimePlay".
  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() => testData.state.gameState === "realTimePlay");
}, 10000);

test('Repeated, invalid, out-of-order actions do not affect choosing positions', async () => {
  let testData = await startGame();

  // captain chooses twice; only first one takes effect.
  clients[0].emit("choose_initial_position", {row: 0, column: 1});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'A'));
  let versionBeforeNewAttempt = testData.state.version;
  clients[0].emit("choose_initial_position", {row: 5, column: 4});
  await (expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeNewAttempt && testData.state.submarines[0].row === 0 && testData.state.submarines[0].col === 1
  ));

  // captain chooses invalid position; they are not added to the list of subs with chosen positions.
  let versionBeforeBadPosition = testData.state.version;
  clients[4].emit("choose_initial_position", {row: 2, column: 2});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeBadPosition
    && !testData.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'B')
  );

  for (let i = 0; i < clients.length; ++i) {
    clients[i].emit("ready_to_resume_real_time_play");
    await expect.poll(() => null).toSatisfy(() =>
      testData.state.gameStateData.choosingStartPositions.playerIdsReadyToContinue.some(playerId => playerId === testData.ids[i]));
  }

  // game state is still "choosingStartPositions".
  await expect.poll(() => null).toSatisfy(() => testData.state.gameState === "choosingStartPositions");

  // now captain chooses valid position, and state transition occurs.
  clients[4].emit("choose_initial_position", {row: 3, column: 4});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.some(subId => subId === 'B'));
  await expect.poll(() => null, {timeout: 4000}).toSatisfy(() => testData.state.gameState === "realTimePlay");
}, 10000);

test('Captain moves, guage is charged, and engineer crosses out a slot.', async () => {
  let testData = await startGame();

  await chooseInitialPositions(testData, {row: 4, column: 5}, {row: 0, column: 0});

  // Should be waiting for command.
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].submarineState === 'waitingForAction'
  );

  testData.subs[0].co.emit("move", "N");
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].row === 3 && testData.state.submarines[0].col === 5
  );
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].submarineState === 'doingPostMovementActions'
    && !testData.state.submarines[0].submarineStateData.doingPostMovementActions.engineerCrossedOutSystem
    && !testData.state.submarines[0].submarineStateData.doingPostMovementActions.xoChargedGauge
  );

  testData.subs[0].xo.emit("charge_gauge", 'silence');
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].submarineStateData.doingPostMovementActions.xoChargedGauge
    && testData.state.submarines[0].actionGauges.silence === 1
  );

  testData.subs[0].eng.emit("cross_off_system", {direction: 'N', slotId: 'slot01'});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].engineLayout.crossedOutSlots.some(s => s.direction === 'N' && s.slotId === 'slot01') &&
    testData.state.submarines[0].submarineState === 'waitingForAction'
  );
}, 10000);

test('Invalid, duplicate, and out-of-order commands are ignored.', async () => {
  let testData = await startGame();

  await chooseInitialPositions(testData, {row: 2, column: 1}, {row: 0, column: 0});

  // Captain moves onto land.
  let versionBeforeMoveToLand = testData.state.version;
  testData.subs[0].co.emit("move", "E");
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeMoveToLand &&
    testData.state.submarines[0].submarineState === 'waitingForAction'
  );

  // Captain moves off the board.
  let versionBeforeMoveOffBoard = testData.state.version;
  testData.subs[1].co.emit("move", "W");
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeMoveOffBoard &&
    testData.state.submarines[1].submarineState === 'waitingForAction'
  );

  // Non-captain tries to move.
  let versionBeforeNonCaptainAttemptsMove = testData.state.version;
  testData.subs[0].xo.emit("move", "N");
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeNonCaptainAttemptsMove &&
    testData.state.submarines[0].submarineState === 'waitingForAction'
  );

  // Engineer tries to cross off before the captain moves (fails).
  let versionBeforeIllegalCrossOff = testData.state.version;
  testData.subs[0].eng.emit("cross_off_system", {direction: 'N', slotId: 'slot01'});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeIllegalCrossOff &&
    testData.state.submarines[0].submarineState === 'waitingForAction' &&
    testData.state.submarines[0].engineLayout.crossedOutSlots.length === 0 &&
    !testData.state.submarines[0].submarineStateData.doingPostMovementActions.engineerCrossedOutSystem
  );

  // First officer tries to increase a gauge before the captain moves (fails).
  let versionBeforeIllegalGaugeIncrease = testData.state.version;
  testData.subs[0].xo.emit("charge_gauge", 'silence');
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeIllegalGaugeIncrease
    && testData.state.submarines[0].submarineState === 'waitingForAction'
    && !testData.state.submarines[0].submarineStateData.doingPostMovementActions.xoChargedGauge
    && testData.state.submarines[0].actionGauges.silence === 0
  );

  // Captain tries to move after initial move, but before XO/Eng have performed their actions.
  testData.subs[0].co.emit("move", "N");
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].submarineState === 'doingPostMovementActions' &&
    testData.state.submarines[0].row === 1 &&
    testData.state.submarines[0].col === 1
  );
  let versionBeforeSecondMove = testData.state.version;
  testData.subs[0].co.emit("move", "W");
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.version > versionBeforeSecondMove &&
    testData.state.submarines[0].row === 1 &&
    testData.state.submarines[0].col === 1
  );

  testData.subs[0].xo.emit("charge_gauge", 'silence');
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].submarineStateData.doingPostMovementActions.xoChargedGauge
    && testData.state.submarines[0].actionGauges.silence === 1
  );

  // Engineer crosses off something in different direction than the one moved.
  testData.subs[0].eng.emit("cross_off_system", {direction: 'W', slotId: 'slot01'});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].engineLayout.crossedOutSlots.length === 0 &&
    testData.state.submarines[0].submarineState === 'doingPostMovementActions'
  );

  testData.subs[0].eng.emit("cross_off_system", {direction: 'N', slotId: 'slot01'});
  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].engineLayout.crossedOutSlots.some(c => c.direction === 'N' && c.slotId === 'slot01') &&
    testData.state.submarines[0].submarineState === 'waitingForAction'
  );
}, 10000);

test('Crossing out whole direction results in loss of health.', async () => {
  let testData = await startGame();
  await chooseInitialPositions(testData, {row: 8, column: 6}, {row: 0, column: 0});
  // This crossed-out slot should be removed after taking damage.
  await move(testData, 0, 'W', 'torpedo', 'slot01');
  // Move until all slots in single direction get crossed out.
  await move(testData, 0, 'N', 'silence', 'slot01');
  await move(testData, 0, 'N', 'silence', 'slot02');
  await move(testData, 0, 'N', 'silence', 'slot03');
  await move(testData, 0, 'N', 'silence', 'reactor01');
  await move(testData, 0, 'N', 'silence', 'reactor02');
  await move(testData, 0, 'N', 'mine', 'reactor03');

  await expect.poll(() => null).toSatisfy(() =>
    testData.state.submarines[0].engineLayout.crossedOutSlots.length === 0
    && testData.state.submarines[0].health === 3
  );
}, 10000);

// Tests to be added later. These tests will require a static engine layout, and I don't want to think through that right now. In theory, though, code is implemented.

// test('Crossing out all reactors results in loss of health.', async() => {

// }, 10000);

// test('Crossing out circuit restores slots.', async () => {

// }, 10000);

// test('Losing all health results in game loss.', async () => {

// }, 10000)

// test('After all moves are charged, ', async () => {

// }, 10000);
