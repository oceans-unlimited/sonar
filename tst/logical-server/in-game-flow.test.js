import { GlobalPhases, InterruptTypes, SubmarineStates } from '../../src/constants.js';
import { LogicalServer } from '../../src/logical-server.lib.js';
import { test, assert } from 'vitest';

function startGame() {
  const server = new LogicalServer();
  
  server.addPlayer("sub0co");
  server.addPlayer("sub0xo");
  server.addPlayer("sub0sonar");
  server.addPlayer("sub0eng");
  server.addPlayer("sub1co");
  server.addPlayer("sub1xo");
  server.addPlayer("sub1sonar");
  server.addPlayer("sub1eng");

  server.selectRole("sub0co", 0, "co");
  server.selectRole("sub0xo", 0, "xo");
  server.selectRole("sub0sonar", 0, "sonar");
  server.selectRole("sub0eng", 0, "eng");
  server.selectRole("sub1co", 1, "co");
  server.selectRole("sub1xo", 1, "xo");
  server.selectRole("sub1sonar", 1, "sonar");
  server.selectRole("sub1eng", 1, "eng");

  server.ready("sub0co");
  server.ready("sub0xo");
  server.ready("sub0sonar");
  server.ready("sub0eng");
  server.ready("sub1co");
  server.ready("sub1xo");
  server.ready("sub1sonar");
  server.ready("sub1eng");

  server.startGame();

  return server;
}

function chooseInitialPositions(
    /**@type {LogicalServer} */ server,
    /**@type {{row: number, column: number}} */ sub0Position,
    /**@type {{row: number, column: number}} */ sub1Position) {
  
  server.chooseInitialPosition("sub0co", sub0Position.row, sub0Position.column);
  server.chooseInitialPosition("sub1co", sub1Position.row, sub1Position.column);

  server.readyInterrupt("sub0co");
  server.readyInterrupt("sub0xo");
  server.readyInterrupt("sub0sonar");
  server.readyInterrupt("sub0eng");
  server.readyInterrupt("sub1co");
  server.readyInterrupt("sub1xo");
  server.readyInterrupt("sub1sonar");
  assert(server.readyInterrupt("sub1eng"));

  server.resumeFromInterrupt();
  assert(server.state.activeInterrupt === null);
}

function move(
    /**@type {LogicalServer} */
    server,
    /**@type {number} */
    subIndex,
    /**@type {"N" | "S" | "E" | "W"} */
    direction,
    /**@type {"mine" | "torpedo" | "drone" | "sonar" | "silence"} */
    gaugeToIncrement,
    /**@type {"slot01" | "slot02" | "slot03" | "reactor01" | "reactor02" | "reactor03"} */
    slotIdToCrossOff) {
  let gaugeBeforeMoveNext = server.state.submarines[subIndex].actionGauges[gaugeToIncrement];
  assert(gaugeBeforeMoveNext === 0 || gaugeBeforeMoveNext > 0);
  server.move(`sub${subIndex}co`, direction);
  assert(server.state.submarines[subIndex].submarineState === SubmarineStates.MOVED);
  let versionBeforePostMoveActions = server.state.version;
  server.chargeGauge(`sub${subIndex}xo`, gaugeToIncrement);
  server.crossOffSystem(`sub${subIndex}eng`, direction, slotIdToCrossOff);
  assert(server.state.version > versionBeforePostMoveActions);
  assert(server.state.submarines[subIndex].submarineState === SubmarineStates.SUBMERGED);
}

test('Captains select starting position', () => {
  let server = startGame();

  // both captains select positions.
  let shouldResumeAfterFirstSelection = server.chooseInitialPosition("sub0co", 0, 1);
  assert(!shouldResumeAfterFirstSelection);
  assert(server.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.some(subId => subId === 'A'));
  assert(server.state.submarines[0].row === 0);
  assert(server.state.submarines[0].col === 1);
  let shouldResumeAfterAllSelected = server.chooseInitialPosition("sub1co", 2, 3);
  assert(shouldResumeAfterAllSelected);
  assert(server.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.some(subId => subId === 'B'));
  assert(server.state.submarines[1].row === 2);
  assert(server.state.submarines[1].col === 3);

  server.resumeFromInterrupt();

  assert(server.state.phase === GlobalPhases.LIVE);
});

test('Repeated, invalid, out-of-order actions do not affect choosing positions', () => {
  let server = startGame();

  // captain chooses twice; only first one takes effect.
  server.chooseInitialPosition("sub0co", 0, 1);
  assert(server.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.some(subId => subId === 'A'));
  let versionBeforeNewAttempt = server.state.version;
  server.chooseInitialPosition("sub0co", 5, 4);
  assert(server.state.version > versionBeforeNewAttempt);
  assert(server.state.submarines[0].row === 0);
  assert(server.state.submarines[0].col === 1);

  // captain chooses invalid position; they are not added to the list of subs with chosen positions.
  let versionBeforeBadPosition = server.state.version;
  server.chooseInitialPosition("sub1co", 2, 2);
  assert(server.state.version > versionBeforeBadPosition);
  assert(!server.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.some(subId => subId === 'B'));

  // game state is still "choosingStartPositions".
  assert(server.state.phase === GlobalPhases.INTERRUPT);
  assert(server.state.activeInterrupt && server.state.activeInterrupt.type === InterruptTypes.START_POSITIONS);

  // now captain chooses valid position, and state transition occurs.
  let shouldResumeRealTimePlay = server.chooseInitialPosition("sub1co", 3, 4);
  assert(shouldResumeRealTimePlay);
  assert(server.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.some(subId => subId === 'B'));
  server.resumeFromInterrupt();
  assert(server.state.phase === GlobalPhases.LIVE);
});

test('Captain moves, guage is charged, and engineer crosses out a slot.', () => {
  let server = startGame();

  chooseInitialPositions(server, {row: 4, column: 5}, {row: 0, column: 0});

  // Should be waiting for command.
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);

  server.move("sub0co", "N");
  assert(server.state.submarines[0].row === 3);
  assert(server.state.submarines[0].col === 5);
  assert(server.state.submarines[0].submarineState === SubmarineStates.MOVED);
  assert(server.state.submarines[0].submarineStateData.MOVED.engineerCrossedOutSystem === false);
  assert(server.state.submarines[0].submarineStateData.MOVED.xoChargedGauge === false);

  server.chargeGauge("sub0xo", "silence");
  assert(server.state.submarines[0].submarineStateData.MOVED.xoChargedGauge);
  assert(server.state.submarines[0].actionGauges.silence === 1);

  server.crossOffSystem("sub0eng", "N", 'slot01');
  assert(server.state.submarines[0].engineLayout.crossedOutSlots.some(s => s.direction === 'N' && s.slotId === 'slot01'));
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);
});

test('Invalid, duplicate, and out-of-order commands are ignored.', () => {
  let server = startGame();

  chooseInitialPositions(server, {row: 2, column: 1}, {row: 0, column: 0});

  // Captain moves onto land.
  let versionBeforeMoveToLand = server.state.version;
  server.move("sub0co", "E");
  assert(server.state.version > versionBeforeMoveToLand);
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);

  // Captain moves off the board.
  let versionBeforeMoveOffBoard = server.state.version;
  server.move("sub1co", "W");
  assert(server.state.version > versionBeforeMoveOffBoard);
  assert(server.state.submarines[1].submarineState === SubmarineStates.SUBMERGED);

  // Non-captain tries to move.
  let versionBeforeNonCaptainAttemptsMove = server.state.version;
  server.move("sub0xo", "N");
  assert(server.state.version > versionBeforeNonCaptainAttemptsMove);
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);

  // Engineer tries to cross off before the captain moves (fails).
  let versionBeforeIllegalCrossOff = server.state.version;
  server.crossOffSystem("sub0eng", "N", "slot01");
  assert(server.state.version > versionBeforeIllegalCrossOff);
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);
  assert(server.state.submarines[0].engineLayout.crossedOutSlots.length === 0);
  assert(server.state.submarines[0].submarineStateData.MOVED.engineerCrossedOutSystem === false);

  // First officer tries to increase a gauge before the captain moves (fails).
  let versionBeforeIllegalGaugeIncrease = server.state.version;
  server.chargeGauge("sub0xo", 'silence');
  assert(server.state.version > versionBeforeIllegalGaugeIncrease);
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);
  assert(server.state.submarines[0].submarineStateData.MOVED.xoChargedGauge === false);
  assert(server.state.submarines[0].actionGauges.silence === 0);

  // Captain tries to move after initial move, but before XO/Eng have performed their actions.
  server.move("sub0co", "N");
  assert(server.state.submarines[0].submarineState === SubmarineStates.MOVED);
  assert(server.state.submarines[0].row === 1);
  assert(server.state.submarines[0].col === 1);
  let versionBeforeSecondMove = server.state.version;
  server.move("sub0co", "W");
  assert(server.state.version > versionBeforeSecondMove);
  assert(server.state.submarines[0].row === 1);
  assert(server.state.submarines[0].col === 1);

  server.chargeGauge("sub0xo", "silence");
  assert(server.state.submarines[0].submarineStateData.MOVED.xoChargedGauge === true);
  assert(server.state.submarines[0].actionGauges.silence === 1);

  // Engineer crosses off something in different direction than the one moved.
  server.crossOffSystem("sub0eng", "W", "slot01");
  assert(server.state.submarines[0].engineLayout.crossedOutSlots.length === 0);
  assert(server.state.submarines[0].submarineState === SubmarineStates.MOVED);

  server.crossOffSystem("sub0eng", "N", "slot01");
  assert(server.state.submarines[0].engineLayout.crossedOutSlots.some(c => c.direction === 'N' && c.slotId === 'slot01'));
  assert(server.state.submarines[0].submarineState === SubmarineStates.SUBMERGED);
});

test('Crossing out whole direction results in loss of health.', () => {
  let server = startGame();
  chooseInitialPositions(server, {row: 8, column: 6}, {row: 0, column: 0});
  // This crossed-out slot should be removed after taking damage.
  move(server, 0, 'W', 'torpedo', 'slot01');
  // Move until all slots in single direction get crossed out.
  move(server, 0, 'N', 'silence', 'slot01');
  move(server, 0, 'N', 'silence', 'slot02');
  move(server, 0, 'N', 'silence', 'slot03');
  move(server, 0, 'N', 'silence', 'reactor01');
  move(server, 0, 'N', 'silence', 'reactor02');
  move(server, 0, 'N', 'mine', 'reactor03');

  assert(server.state.submarines[0].engineLayout.crossedOutSlots.length === 0);
  assert(server.state.submarines[0].health === 3);
});

// Tests to be added later. These tests will require a static engine layout, and I don't want to think through that right now. In theory, though, code is implemented.

// test('Crossing out all reactors results in loss of health.', async() => {

// }, 10000);

// test('Crossing out circuit restores slots.', () => {

// }, 10000);

// test('Losing all health results in game loss.', () => {

// }, 10000)

// test('After all moves are charged, ', () => {

// }, 10000);
