import { EngineLayoutGenerator } from "./engineLayout.lib.js";
import { generateBoard } from "./board-layout.lib.js";
import { W as WATER, L as LAND } from "./board-layout.lib.js";
import { GlobalPhases, InterruptTypes, SubmarineStates } from "./constants.js";

export class LogicalServer {
  constructor() {
    this.usedPlayerNumbers = {};
    this.state = {
      version: 0,
      phase: GlobalPhases.LOBBY,
      activeInterrupt: null,
      players: [],
      adminId: null,
      submarines: [this.createSubmarine('A'), this.createSubmarine('B')],
      ready: [],
      board: generateBoard(),
      gameStateData: {
        choosingStartPositions: {
          playerIdsReadyToContinue: [],
          submarineIdsWithStartPositionChosen: [],
        },
      },
    };
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
      pastTrack: [],
      submarineStateData: {
        [SubmarineStates.POST_MOVEMENT]: {
          engineerCrossedOutSystem: false,
          xoChargedGauge: false,
          directionMoved: ' ',
        }
      },
    }
  }

  disconnect(playerId) {
    delete this.usedPlayerNumbers[playerId];
    this.state.players = this.state.players.filter(p => p.id !== playerId);
    this.state.ready = this.state.ready.filter(id => id !== playerId);
    this.state.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );

    const isInProgress = this.state.phase === GlobalPhases.LIVE ||
      (this.state.phase === GlobalPhases.INTERRUPT && this.state.activeInterrupt?.type !== InterruptTypes.PLAYER_DISCONNECT);

    if (isInProgress) {
      this.state.phase = GlobalPhases.INTERRUPT;
      this.state.activeInterrupt = {
        type: InterruptTypes.PLAYER_DISCONNECT,
        payload: { message: "Player Disconnected" }
      };
      this.state.ready = [];
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
    if (0 <= submarine && submarine < this.state.submarines.length && !this.state.submarines[submarine][role]) {
      this.state.submarines.forEach(submarineObj =>
        Object.keys(submarineObj).forEach(rk => {
          if (submarineObj[rk] === playerId) submarineObj[rk] = null;
        })
      );
      this.state.submarines[submarine][role] = playerId;
      this.state.ready = this.state.ready.filter(id => id !== playerId);
      this.state.version++;
    }
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

  ready(playerId, allRolesReadyCallback, gameStartedCallback) {
    if (this.state.phase !== GlobalPhases.LOBBY) return;

    if (this.state.submarines.some(sub =>
      Object.keys(sub).some(role => sub[role] === playerId)
    ) && !this.state.ready.includes(playerId)) {
      this.state.ready.push(playerId);
      this.state.version++;
    }

    const allRolesAreReady = this.state.submarines.every(sub =>
      ['co', 'xo', 'sonar', 'eng'].every(rk => this.state.ready.includes(sub[rk]))
    );

    if (allRolesAreReady && this.state.phase === GlobalPhases.LOBBY) {
      allRolesReadyCallback();
      this.state.phase = GlobalPhases.INTERRUPT;
      this.state.activeInterrupt = {
        type: InterruptTypes.START_POSITIONS,
        payload: { message: "Captains selecting starting positions" }
      };

      this.state.ready = [];
      this.state.submarines.forEach(sub => {
        ['xo', 'sonar', 'eng'].forEach(role => {
          const pId = sub[role];
          if (pId && !this.state.ready.includes(pId)) {
            this.state.ready.push(pId);
          }
        });
      });

      this.state.board = generateBoard();
      this.state.gameStateData.choosingStartPositions = {
        playerIdsReadyToContinue: [],
        submarineIdsWithStartPositionChosen: [],
      };

      this.state.version++;
      gameStartedCallback();
    }
  }

  notReady(playerId) {
    if (this.state.phase !== GlobalPhases.LOBBY) return;
    this.state.ready = this.state.ready.filter(id => id !== playerId);
    this.state.version++;
  }

  chooseInitialPosition(playerId, row, column) {
    let sub = this.state.submarines.find(sub => sub.co === playerId);
    const isStartPositionsInterrupt = this.state.phase === GlobalPhases.INTERRUPT &&
      this.state.activeInterrupt?.type === InterruptTypes.START_POSITIONS;

    if (sub && isStartPositionsInterrupt) {
      const chosenPositionIsValid = row >= 0 && row < this.state.board.length &&
        column >= 0 && column < this.state.board[0].length &&
        this.state.board[row][column] === WATER;

      if (chosenPositionIsValid) {
        sub.row = row;
        sub.col = column;
        sub.pastTrack = [{ row, col: column }];
        if (!this.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.includes(sub.id)) {
          this.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.push(sub.id);
        }
        this.state.ready = this.state.ready.filter(id => id !== playerId);
        this.state.version++;
      }
    }
  }

  readyInterrupt(playerId, resumeCallback) {
    if (this.state.phase !== GlobalPhases.INTERRUPT) return;

    const isStartPositions = this.state.activeInterrupt?.type === InterruptTypes.START_POSITIONS;
    const sub = this.state.submarines.find(s => s.co === playerId);

    if (this.state.ready.includes(playerId)) {
      this.state.ready = this.state.ready.filter(id => id !== playerId);
      this.state.version++;
    } else {
      if (isStartPositions && sub) {
        const hasChosen = this.state.gameStateData.choosingStartPositions.submarineIdsWithStartPositionChosen.includes(sub.id);
        if (!hasChosen) return;
      }
      this.state.ready.push(playerId);
      this.state.version++;
    }

    const allPlayersReady = this.state.submarines.every(sub =>
      ['co', 'xo', 'sonar', 'eng'].every(role => {
        const pId = sub[role];
        return !pId || this.state.ready.includes(pId);
      })
    );

    if (allPlayersReady) {
      // Immediate transition for E2E stability
      this.state.phase = GlobalPhases.LIVE;
      this.state.activeInterrupt = null;
      this.state.ready = [];
      this.state.version++;
      resumeCallback();
    }
  }

  readyToResumeRealTimePlay(playerId, callback) {
    this.readyInterrupt(playerId, callback);
  }

  requestPause(playerId) {
    if (this.state.phase !== GlobalPhases.LIVE) return;
    this.state.phase = GlobalPhases.INTERRUPT;
    this.state.activeInterrupt = { type: InterruptTypes.PAUSE, payload: { message: "Paused by Captain" } };
    this.state.ready = [];
    this.state.version++;
  }

  submitSonarResponse(playerId, response, resumeCallback) {
    const rxSub = this.state.submarines.find(sub => sub.co === playerId);
    if (!rxSub || !this.state.activeInterrupt || this.state.activeInterrupt.type !== InterruptTypes.SONAR_PING) return;
    this.state.activeInterrupt.payload.response = response;
    this.state.version++;
    setTimeout(() => {
      this.state.phase = GlobalPhases.LIVE;
      this.state.activeInterrupt = null;
      this.state.version++;
      resumeCallback();
    }, 100);
  }

  move(playerId, direction) {
    if (this.state.phase !== GlobalPhases.LIVE) return;
    let movingSub = this.state.submarines.find(sub => sub.co === playerId);
    if (movingSub && movingSub.submarineState === SubmarineStates.SUBMERGED) {
      const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };
      const lastMove = movingSub.submarineStateData.doingPostMovementActions?.directionMoved;

      // Rule: cannot move in opposite direction of last move
      if (lastMove && lastMove !== ' ' && direction === opposite[lastMove]) return;

      const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
      const colDeltas = { N: 0, S: 0, E: 1, W: -1 };
      if (['N', 'S', 'E', 'W'].includes(direction)) {
        let newRow = movingSub.row + rowDeltas[direction];
        let newCol = movingSub.col + colDeltas[direction];

        // Validations:
        // 1. Within board bounds
        // 2. Square is WATER
        // 3. Square not in pastTrack
        const withinBounds = 0 <= newRow && newRow < this.state.board.length && 0 <= newCol && newCol < this.state.board[0].length;
        const isWater = withinBounds && this.state.board[newRow][newCol] === WATER;
        const notInTrack = withinBounds && !movingSub.pastTrack.some(pos => pos.row === newRow && pos.col === newCol);

        if (withinBounds && isWater && notInTrack) {
          movingSub.row = newRow;
          movingSub.col = newCol;
          movingSub.pastTrack.push({ row: newRow, col: newCol });
          movingSub.submarineState = SubmarineStates.POST_MOVEMENT;
          movingSub.submarineStateData[movingSub.submarineState] = {
            engineerCrossedOutSystem: false,
            xoChargedGauge: Object.values(movingSub.actionGauges).every(v => v >= 3),
            directionMoved: direction,
          };
          this.state.version++;
        }
      }
    }
  }

  chargeGauge(playerId, gauge) {
    let sub = this.state.submarines.find(s => s.xo === playerId);
    if (sub && sub.submarineState === SubmarineStates.POST_MOVEMENT) {
      let stateData = sub.submarineStateData[sub.submarineState];
      if (!stateData.xoChargedGauge) {
        let max = gauge === 'silence' ? 5 : 3;
        if (sub.actionGauges[gauge] < max) {
          sub.actionGauges[gauge]++;
          stateData.xoChargedGauge = true;
          if (stateData.xoChargedGauge && stateData.engineerCrossedOutSystem) {
            sub.submarineState = SubmarineStates.SUBMERGED;
          }
          this.state.version++;
        }
      }
    }
  }

  crossOffSystem(playerId, direction, slotId, gameOverCallback) {
    let sub = this.state.submarines.find(s => s.eng === playerId);
    if (sub && sub.submarineState === SubmarineStates.POST_MOVEMENT) {
      let stateData = sub.submarineStateData[sub.submarineState];
      if (!stateData.engineerCrossedOutSystem && stateData.directionMoved === direction) {
        sub.engineLayout.crossedOutSlots.push({ direction, slotId });
        stateData.engineerCrossedOutSystem = true;

        if (stateData.xoChargedGauge && stateData.engineerCrossedOutSystem) {
          sub.submarineState = SubmarineStates.SUBMERGED;
        }
        this.state.version++;
      }
    }
  }

  addPlayer(playerId) {
    if (this.state.players.find(p => p.id === playerId)) return;

    let playerNumber = 1;
    while (Object.values(this.usedPlayerNumbers).some(usedNumber => playerNumber === usedNumber)) playerNumber++;
    this.usedPlayerNumbers[playerId] = playerNumber;
    this.state.players.push({ id: playerId, name: `Player ${playerNumber}`, connectionOrder: Date.now(), ready: false });
    if (!this.state.adminId) this.state.adminId = playerId;
    this.state.version++;
  }

}