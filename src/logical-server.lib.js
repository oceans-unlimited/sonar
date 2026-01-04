import { EngineLayoutGenerator } from "./engineLayout.lib.js";
import { generateBoard } from "./board-layout.lib.js";
import { W as WATER, L as LAND } from "./board-layout.lib.js";
import { GlobalPhases, InterruptTypes, SubmarineStates } from "./constants.js";

export class LogicalServer {
  usedPlayerNumbers = {};
  state = {
    winner: null,
    version: 0,
    phase: GlobalPhases.LOBBY,
    activeInterrupt: null, // { type, payload, data }
    /**@type {{id: string, name: string, connectionOrder: number, ready: boolean}[]} */
    players: [],
    adminId: null,
    submarines: [this.createSubmarine('A'), this.createSubmarine('B')],
    ready: [],
    board: generateBoard(),
  };

  constructor() {
  }

  playerName(playerId) {
    return this.state.players.find(p => p.id === playerId)?.name;
  }

  createSubmarine(id) {
    const engineLayoutGenerator = new EngineLayoutGenerator();
    return {
      id: id,
      name: `Sub ${id}`,
      co: null,
      xo: null,
      sonar: null,
      eng: null,
      engineLayout: engineLayoutGenerator.generateLayout(),
      actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: 0 },
      row: 0,
      col: 0,
      health: 4,
      submarineState: SubmarineStates.SUBMERGED,
      submarineStateData: {
        MOVED: {
          engineerCrossedOutSystem: false,
          xoChargedGauge: false,
          directionMoved: ' ',
        },
        SURFACING: {
          roleTaskCompletion: [
            {role: 'co', completed: false},
            {role: 'xo', completed: false},
            {role: 'eng', completed: false},
            {role: 'sonar', completed: false},
          ],
        },
      },
      /**@type {{row: number, col: number}[]} */
      track_path: [],
    }
  }

  addPlayer(playerId) {
    let playerNumber = 1;
    while (Object.values(this.usedPlayerNumbers).some(usedNumber => playerNumber === usedNumber))
      playerNumber++;
    this.usedPlayerNumbers[playerId] = playerNumber;

    const playerName = `Player ${playerNumber}`;
    this.state.players.push({
      id: playerId,
      name: playerName,
      connectionOrder: Date.now(),
      ready: false,
    });

    if (!this.state.adminId) this.state.adminId = playerId;

    this.state.version++;
  }

  disconnect(playerId) {
    delete this.usedPlayerNumbers[playerId];
    // Remove player record
    this.state.players = this.state.players.filter(p => p.id !== playerId);
    // Remove from ready list
    this.state.ready = this.state.ready.filter(id => id !== playerId);
    // Vacate any roles held by this player
    this.state.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );

    // Trigger disconnect interrupt if game is in progress
    const isInProgress = this.state.phase === GlobalPhases.LIVE ||
      (this.state.phase === GlobalPhases.INTERRUPT && this.state.activeInterrupt?.type !== InterruptTypes.PLAYER_DISCONNECT);

    if (isInProgress) {
      this.state.phase = GlobalPhases.INTERRUPT;
      this.state.activeInterrupt = {
        type: InterruptTypes.PLAYER_DISCONNECT,
        payload: { message: "Player Disconnected" }
      };
      this.state.ready = []; // Re-reset to be sure
    }

    if (this.state.adminId && this.state.adminId === playerId) {
      this.state.adminId = null;
    }
    this.state.version++;
  }



  changeName(playerId, new_name) {
    if (this.state.phase !== GlobalPhases.LOBBY) return;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;
    player.name = new_name;
    this.state.version++;
  }

  selectRole(playerId, submarine, role) {
    if (this.state.phase !== GlobalPhases.LOBBY) return;

    if (
      0 <= submarine &&
      submarine < this.state.submarines.length &&
      !this.state.submarines[submarine][role]
    ) {
      // leave existing role
      this.state.submarines.forEach(submarineObj =>
        Object.keys(submarineObj).forEach(rk => {
          if (submarineObj[rk] === playerId) submarineObj[rk] = null;
        })
      );
      // go to new role
      this.state.submarines[submarine][role] = playerId;

      // un-ready the player
      this.state.ready = this.state.ready.filter(id => id !== playerId);
    }
    this.state.version++;
  }

  leaveRole(playerId) {
    if (this.state.phase !== GlobalPhases.LOBBY) return;

    this.state.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );

    this.state.ready = this.state.ready.filter(id => id !== playerId);

    this.state.version++;
  }

  ready(playerId) {
    if (this.state.phase !== GlobalPhases.LOBBY) return;

    if (this.state.submarines.some(sub =>
      Object.keys(sub).some(role => sub[role] === playerId)
    ) && !this.state.ready.includes(playerId)) {
      this.state.ready.push(playerId);
    }

    const allRolesAreReady = this.state.submarines.every(sub =>
      ['co', 'xo', 'sonar', 'eng'].every(rk => this.state.ready.includes(sub[rk]))
    );
    
    if (allRolesAreReady && this.state.phase === GlobalPhases.LOBBY) {
      this.state.phase = GlobalPhases.GAME_BEGINNING;
    }
    
    this.state.version++;
  }

  startGame() {
    if (this.state.phase !== GlobalPhases.GAME_BEGINNING)
      return;

    // Instead of directly going to 'in_game' / LIVE, we go to INTERRUPT: START_POSITIONS
    this.state.phase = GlobalPhases.INTERRUPT;
    this.state.activeInterrupt = {
      type: InterruptTypes.START_POSITIONS,
      payload: { message: "Captains selecting starting positions" },
      data: {submarineIdsWithStartPositionChosen: []},
    };
    this.state.ready = []; // Reset ready states for initial position phase


    const engineLayoutGenerator = new EngineLayoutGenerator();
    this.state.submarines.forEach(sub => {
      sub.engineLayout = engineLayoutGenerator.generateLayout();
    });
    this.state.board = generateBoard();

    this.state.version++;
  }

  notReady(playerId) {
    if (this.state.phase !== GlobalPhases.LOBBY)
      return;

    this.state.ready = this.state.ready.filter(id => id !== playerId);
    this.state.version++;
  }

  chooseInitialPosition(playerId, row, column) {
    let sub = this.state.submarines.find(sub => sub.co === playerId);
    const isStartPositionsInterrupt = this.state.phase === GlobalPhases.INTERRUPT &&
      this.state.activeInterrupt?.type === InterruptTypes.START_POSITIONS;

    let allSubsHaveChosen = false;
    if (sub && isStartPositionsInterrupt) {
      let subIdsThatHaveChosen = this.state.activeInterrupt.data.submarineIdsWithStartPositionChosen;
      let thisSubAlreadyChose = subIdsThatHaveChosen.find(s => s === sub.id);
      if (!thisSubAlreadyChose) {
        let chosenPositionIsValid = 0 <= row && row <= this.state.board.length &&
          0 <= column && column <= this.state.board[0].length;
        if (chosenPositionIsValid && this.state.board[row][column] === WATER) {
          sub.row = row;
          sub.col = column;
          if (!this.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.includes(sub.id)) {
            this.state.activeInterrupt.data.submarineIdsWithStartPositionChosen.push(sub.id);
          }

          allSubsHaveChosen = this.state.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
        }
      }
    }

    this.state.version++;
    return allSubsHaveChosen;
  }

  resumeFromInterrupt() {
    if (this.state.phase !== GlobalPhases.INTERRUPT)
      return;

    this.state.phase = GlobalPhases.LIVE;
    this.state.activeInterrupt = null;
    this.state.ready = [];
    this.state.version++;
  }

  requestPause(playerId) {
    if (this.state.phase !== GlobalPhases.LIVE) return;

    this.state.phase = GlobalPhases.INTERRUPT;
    this.state.activeInterrupt = {
      type: InterruptTypes.PAUSE,
      payload: { message: "Paused by Captain" }
    };
    this.state.ready = []; // Reset ready states for out-of-game interrupt
    this.state.version++;
  }

  readyInterrupt(playerId) {
    if (this.state.phase !== GlobalPhases.INTERRUPT) return;
    if (this.state.ready.includes(playerId)) return;

    this.state.ready.push(playerId);
    this.state.version++;

    // Check if all players in the game are ready
    const allPlayersReady = this.state.submarines.every(sub =>
      ['co', 'xo', 'sonar', 'eng'].every(role => {
        const pId = sub[role];
        return !pId || this.state.ready.includes(pId);
      })
    );

    return allPlayersReady;
  }

  submitSonarResponse(playerId, response) {
    const rxSub = this.state.submarines.find(sub => sub.co === playerId);
    if (!rxSub || !this.state.activeInterrupt || this.state.activeInterrupt.type !== InterruptTypes.SONAR_PING) return;

    // Update active interrupt with response
    this.state.activeInterrupt.payload.response = response;
    this.state.version++;
  }

  move(playerId, direction) {
    if (this.state.phase !== GlobalPhases.LIVE)
      return;

    let movingSub = this.state.submarines.find(sub => sub.co === playerId);
    if (movingSub && movingSub.submarineState === SubmarineStates.SUBMERGED) {
      const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
      const colDeltas = { N: 0, S: 0, E: 1, W: -1 };
      if (direction == 'N' || direction == 'S' || direction == 'E' || direction == 'W') {
        let newRow = movingSub.row + rowDeltas[direction];
        let newCol = movingSub.col + colDeltas[direction];
        if (0 <= newRow && newRow <= this.state.board.length &&
            0 <= newCol && newCol <= this.state.board[0].length &&
            this.state.board[newRow][newCol] === WATER) {
          if (!movingSub.track_path.some(p => p.row === newRow && p.col === newCol)) {
            movingSub.row = newRow;
            movingSub.col = newCol;
            movingSub.track_path.push({row: newRow, col: newCol});
            movingSub.submarineState = SubmarineStates.MOVED;
            // Reset, since might be set from prior movement.
            movingSub.submarineStateData[movingSub.submarineState] = {
              engineerCrossedOutSystem: false,
              xoChargedGauge: movingSub.actionGauges.mine === 3 &&
                movingSub.actionGauges.torpedo === 3 &&
                movingSub.actionGauges.sonar === 3 &&
                movingSub.actionGauges.silence === 5 &&
                movingSub.actionGauges.drone === 3,
              directionMoved: direction,
            };
          }
        }
      }
    }

    this.state.version++;
  }

  chargeGauge(playerId, gauge) {
    let sub = this.state.submarines.find(s => s.xo === playerId);
    if (sub && sub.submarineState === SubmarineStates.MOVED) {
      let stateData = sub.submarineStateData[sub.submarineState];
      if (!stateData.xoChargedGauge) {
        let gaugeIsValid = Object.keys(sub.actionGauges).some(k => k === gauge);
        if (gaugeIsValid) {
          let max = 3;
          if (gauge === 'silence')
            max = 5;

          if (sub.actionGauges[gauge] < max) {
            sub.actionGauges[gauge]++;
            stateData.xoChargedGauge = true;

            if (stateData.xoChargedGauge && stateData.engineerCrossedOutSystem) {
              // Reset for next time.
              stateData.xoChargedGauge = false;
              stateData.engineerCrossedOutSystem = false;
              // Back to normal state.
              sub.submarineState = SubmarineStates.SUBMERGED;
            }

          }
        }
      }
    }

    this.state.version++;
  }

  crossOffSystem(playerId, direction, slotId) {
    let sub = this.state.submarines.find(s => s.eng === playerId);
    if (sub && sub.submarineState === SubmarineStates.MOVED) {
      let stateData = sub.submarineStateData[sub.submarineState];
      if (!stateData.engineerCrossedOutSystem && direction === stateData.directionMoved) {
        let slotAlreadyCrossedOut = sub.engineLayout.crossedOutSlots.some(slot => slot.direction === direction && slot.slotId === slotId);
        if (!slotAlreadyCrossedOut) {
          sub.engineLayout.crossedOutSlots.push({ direction, slotId });
          stateData.engineerCrossedOutSystem = true;

          if (stateData.xoChargedGauge && stateData.engineerCrossedOutSystem) {
            // Reset for the future.
            stateData.engineerCrossedOutSystem = false;
            stateData.xoChargedGauge = false;
            // Change state.
            sub.submarineState = SubmarineStates.SUBMERGED;
          }

          // Now check for different outcomes based on what was crossed off.
          // - Circuit completed => clear that circuit.
          // - All slots in a direction are crossed off => take one damage.
          // - All radiation symbols are crossed off => take one damage.
          // - Damage taken => clear all crossed-off slots.

          let clearedCircuits = sub.engineLayout.circuits.filter(
            circuit => circuit.connections.every(
              connection => sub.engineLayout.crossedOutSlots.some(
                slot => connection.direction === slot.direction && connection.slotId === slot.slotId)));
          clearedCircuits.forEach(circuit => circuit.connections.forEach(connection => {
            let indexOfCrossedOutSlot = sub.engineLayout.crossedOutSlots.findIndex(slot => slot.direction === connection.direction && slot.slotId === connection.slotId);
            sub.engineLayout.crossedOutSlots.splice(indexOfCrossedOutSlot, 1);
          }));

          let directionData = sub.engineLayout.directions[direction];
          let frameSlotKeys = Object.keys(directionData.frameSlots);
          let allFrameSlotsCrossedOut = frameSlotKeys.every(frameSlotKey => sub.engineLayout.crossedOutSlots.some(crossedOutSlot =>
            crossedOutSlot.slotId === frameSlotKey && crossedOutSlot.direction == direction
          ));
          let reactorSlotKeys = Object.keys(directionData.reactorSlots);
          let allReactorSlotsCrossedOut = reactorSlotKeys.every(reactorSlotKey => sub.engineLayout.crossedOutSlots.some(crossedOutSlot =>
            crossedOutSlot.slotId === reactorSlotKey && crossedOutSlot.direction === direction
          ));
          let entireDirectionCrossedOut = allFrameSlotsCrossedOut && allReactorSlotsCrossedOut;

          let directionKeys = Object.keys(sub.engineLayout.directions);
          let allReactorsCrossedOut = directionKeys.every(d => {
            let directionData = sub.engineLayout.directions[d];
            let reactorSlotKeys = Object.keys(directionData.reactorSlots);
            return reactorSlotKeys.every(slotId =>
              directionData.reactorSlots[slotId] !== 'reactor' ||
              sub.engineLayout.crossedOutSlots.some(crossedOutSlot =>
                crossedOutSlot.slotId === slotId && crossedOutSlot.direction === d
              )
            );
          });

          if (entireDirectionCrossedOut) {
            sub.health--;
            sub.engineLayout.crossedOutSlots.splice(0, sub.engineLayout.crossedOutSlots.length);
          }
          if (allReactorsCrossedOut) {
            sub.health--;
            sub.engineLayout.crossedOutSlots.splice(0, sub.engineLayout.crossedOutSlots.length);
          }
          sub.health = Math.max(0, sub.health);

          if (sub.health === 0) {
            this.state.winner = this.state.submarines.find(s => s.id !== sub.id).id;
            this.state.phase = GlobalPhases.GAME_OVER;
          }

        }
      }
    }

    this.state.version++;
  }

  surface(playerId) {
    this.state.version++;

    // find the submarine I'm on
    let surfacingSub = this.state.submarines.find(s => [s.co, s.xo, s.eng, s.sonar].some(p => p === playerId));
    if (!surfacingSub)
      return;

    // make sure the global phase and sub state is right (must be SUBMERGED)
    if (this.state.phase !== GlobalPhases.LIVE || surfacingSub.submarineState !== SUBMERGED)
      return;

    // set sub state to SURFACING, and reset task data
    surfacingSub.submarineState = SubmarineStates.SURFACING;
    surfacingSub.submarineStateData.SURFACING.roleTaskCompletion.forEach(
      roleAndCompleted => {
        roleAndCompleted.completed = false;
      }
    );
  }

  /**Returns true if sub can submerge. */
  completeSurfacingTask(playerId) {
    this.state.version++;
    
    let {sub, role} = this.#getRoleAndSub(playerId);
    if (!sub || !role)
      return;

    if (this.state.phase !== GlobalPhases.LIVE || sub.submarineState !== SUBMERGED)
      return;

    const taskData = sub.submarineStateData.SURFACING.roleTaskCompletion;
    // Previous roles in the order must have completed the task.
    let playerTaskIndex = taskData.findIndex(t => t.role === role);
    for (let i = 0; i < taskData.playerTaskIndex; ++i) {
      if (!taskData[i].completed)
        return;
    }

    taskData[playerTaskIndex].completed = true;
    if (playerTaskIndex === taskData.length - 1) {
      sub.submarineState = SubmarineStates.SURFACED;
      sub.engineLayout.crossedOutSlots.splice(0);
      sub.track_path.splice(0);
      return true;
    } else {
      false;
    }
  }

  submerge(playerId) {
    this.state.version++;

    let {sub} = this.#getRoleAndSub(playerId);
    if (!sub || sub.submarineState !== SubmarineStates.SURFACED)
      return;

    sub.submarineState = SubmarineStates.SUBMERGED;
  }

  getSubName(playerId) {
    return this.state.submarines.find(s => [s.co, s.xo, s.eng, s.sonar].some(p => p === playerId))?.name;
  }

  #getRoleAndSub(playerId) /**@type {sub: ReturnType<typeof createSubmarine>, role: 'co' | 'xo' | 'eng' | 'sonar'} */ {
    let sub = this.state.submarines.find(s => [s.co, s.xo, s.eng, s.sonar].some(p => p === playerId));
    return {
      sub: sub,
      role: !sub ? undefined : Object.keys(sub).find(k => sub[k] === playerId),
    };
  }
}