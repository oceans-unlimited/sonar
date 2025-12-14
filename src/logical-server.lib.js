import { EngineLayoutGenerator } from "./engineLayout.lib.js";
import { generateBoard } from "./board-layout.lib.js";
import { W as WATER, L as LAND } from "./board-layout.lib.js";

export class LogicalServer {
  usedPlayerNumbers = {};
  serverState = {
    version: 0,
    currentState: "lobby",
    players: [],
    adminId: null,
    submarines: [this.createSubmarine('A'), this.createSubmarine('B')],
    ready: [],
    board: generateBoard(),
    gameState: 'choosingStartPositions',
    gameStateData: {
      choosingStartPositions: {
        playerIdsReadyToContinue: [],
        submarineIdsWithStartPositionChosen: [],
      },
    },
  };

  constructor() {
  }

  playerName(playerId) {
    return this.serverState.players.find(p => p.id === playerId)?.name;
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
        actionGauges: {mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: 0},
        row: 0,
        col: 0,
        health: 4,
        submarineState: 'waitingForAction',
        submarineStateData: {
        doingPostMovementActions: {
            engineerCrossedOutSystem: false,
            xoChargedGauge: false,
            directionMoved: ' ',
        }
      },
    }
  }

  disconnect(playerId) {
    delete this.usedPlayerNumbers[playerId];
    // Remove player record
    this.serverState.players = this.serverState.players.filter(p => p.id !== playerId);
    // Remove from ready list
    this.serverState.ready = this.serverState.ready.filter(id => id !== playerId);
    // Vacate any roles held by this player
    this.serverState.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );
    if (this.serverState.adminId && this.serverState.adminId === playerId) {
      this.serverState.adminId = null;
    }
    this.serverState.version++;
  }

  changeName(playerId, new_name) {
    if (this.serverState.currentState !== "lobby") return;

    const player = this.serverState.players.find(p => p.id === playerId);
    if (!player) return;
    player.name = new_name;
    this.serverState.version++;
  }

  selectRole(playerId, submarine, role) {
    if (this.serverState.currentState !== "lobby") return;

    if (
      0 <= submarine &&
      submarine < this.serverState.submarines.length &&
      !this.serverState.submarines[submarine][role]
    ) {
      // leave existing role
      this.serverState.submarines.forEach(submarineObj =>
        Object.keys(submarineObj).forEach(rk => {
          if (submarineObj[rk] === playerId) submarineObj[rk] = null;
        })
      );
      // go to new role
      this.serverState.submarines[submarine][role] = playerId;

      // un-ready the player
      this.serverState.ready = this.serverState.ready.filter(id => id !== playerId);
    }
    this.serverState.version++;
  }

  leaveRole(playerId) {
    if (this.serverState.currentState !== "lobby") return;

    this.serverState.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );

    this.serverState.ready = this.serverState.ready.filter(id => id !== playerId);

    this.serverState.version++;
  }

  ready(playerId, allRolesReadyCallback, gameStartedCallback) {
    if (this.serverState.currentState !== "lobby") return;

    if (this.serverState.submarines.some(sub =>
      Object.keys(sub).some(role => sub[role] === playerId)
    ) && !this.serverState.ready.includes(playerId)) {
      this.serverState.ready.push(playerId);
    }

    const allRolesAreReady = this.serverState.submarines.every(sub =>
      ['co','xo','sonar','eng'].every(rk => this.serverState.ready.includes(sub[rk]))
    );
    if (allRolesAreReady && this.serverState.currentState === "lobby") {
      allRolesReadyCallback();
      this.serverState.currentState = "game_beginning";
      this.serverState.version++;
      setTimeout(() => {
        this.serverState.currentState = "in_game";
        const engineLayoutGenerator = new EngineLayoutGenerator();
        this.serverState.submarines.forEach(sub => {
          sub.engineLayout = engineLayoutGenerator.generateLayout();
        });
        this.serverState.board = generateBoard();
        this.serverState.gameState = "choosingStartPositions";
        this.serverState.version++;
        gameStartedCallback();
      }, 3000);
    }

    this.serverState.version++;
  }

  notReady(playerId) {
    if (this.serverState.currentState !== "lobby")
      return;

    this.serverState.ready = this.serverState.ready.filter(id => id !== playerId);
    this.serverState.version++;
  }

  chooseInitialPosition(playerId, row, column, resumingRealtimePlayCallback) {
    let sub = this.serverState.submarines.find(sub => sub.co === playerId);
    if (sub && this.serverState.gameState === 'choosingStartPositions') {
      let subIdsThatHaveChosen = this.serverState.gameStateData[this.serverState.gameState].submarineIdsWithStartPositionChosen;
      let thisSubAlreadyChose = subIdsThatHaveChosen.find(s => s === sub.id);
      if (!thisSubAlreadyChose) {
        let chosenPositionIsValid = 0 <= row && row <= this.serverState.board.length &&
            0 <= column && column <= this.serverState.board[0].length;
        if (chosenPositionIsValid && this.serverState.board[row][column] === WATER) {
          sub.row = row;
          sub.col = column;
          this.serverState.gameStateData[this.serverState.gameState].submarineIdsWithStartPositionChosen.push(sub.id);

          let allSubsHaveChosen = this.serverState.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
          let readyPlayers = this.serverState.gameStateData[this.serverState.gameState].playerIdsReadyToContinue;
          let allPlayersAreReady = this.serverState.submarines.every(s => readyPlayers.some(r => r === s.co) && readyPlayers.some(r => r === s.xo) && readyPlayers.some(r => r === s.eng) && readyPlayers.some(r => r === s.sonar));
          if (allSubsHaveChosen && allPlayersAreReady) {
            setTimeout(() => {
              this.serverState.gameState = 'realTimePlay';
              this.serverState.gameStateData.choosingStartPositions = {
                playerIdsReadyToContinue: [],
                submarineIdsWithStartPositionChosen: [],
              };

              this.serverState.version++;
              resumingRealtimePlayCallback();
            }, 3000);
          }
        }
      }
    }

    this.serverState.version++;
  }

  readyToResumeRealTimePlay(playerId, resumingRealTimePlayCallback) {
    if (this.serverState.gameState !== 'realTimePlay') {
      let stateName = Object.keys(this.serverState.gameStateData).find(k => k === this.serverState.gameState);
      if (stateName) {
        let playersReady = this.serverState.gameStateData[stateName].playerIdsReadyToContinue;
        let playerAlreadyIndicatedReadiness = playersReady.some(r => r === playerId);
        if (!playerAlreadyIndicatedReadiness) {
          playersReady.push(playerId);

          let subIdsThatHaveChosen = this.serverState.gameStateData[this.serverState.gameState].submarineIdsWithStartPositionChosen;
          let allSubsHaveChosen = this.serverState.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
          let readyPlayers = this.serverState.gameStateData[this.serverState.gameState].playerIdsReadyToContinue;
          let allPlayersAreReady = this.serverState.submarines.every(s => readyPlayers.some(r => r === s.co) && readyPlayers.some(r => r === s.xo) && readyPlayers.some(r => r === s.eng) && readyPlayers.some(r => r === s.sonar));
          if (allSubsHaveChosen && allPlayersAreReady) {
            setTimeout(() => {
              this.serverState.gameState = 'realTimePlay';
              this.serverState.gameStateData.choosingStartPositions = {
                playerIdsReadyToContinue: [],
                submarineIdsWithStartPositionChosen: [],
              };
              this.serverState.version++;
              resumingRealTimePlayCallback();
            }, 3000);
          }
        }
      }
    }

    this.serverState.version++;
  }

  move(playerId, direction) {
    if (this.serverState.currentState !== 'in_game')
      return;

    if (this.serverState.gameState !== 'realTimePlay')
      return;

    let movingSub = this.serverState.submarines.find(sub => sub.co === playerId);
    if (movingSub && movingSub.submarineState === 'waitingForAction') {
      const rowDeltas = {N: -1, S: 1, E: 0, W:  0};
      const colDeltas = {N:  0, S: 0, E: 1, W: -1};
      if (direction == 'N' || direction == 'S' || direction == 'E' || direction == 'W') {
        let newRow = movingSub.row + rowDeltas[direction];
        let newCol = movingSub.col + colDeltas[direction];
        if (0 <= newRow && newRow <= this.serverState.board.length &&
            0 <= newCol && newCol <= this.serverState.board[0].length &&
            this.serverState.board[newRow][newCol] === WATER) {
          movingSub.row = newRow;
          movingSub.col = newCol;
          movingSub.submarineState = 'doingPostMovementActions';
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

    this.serverState.version++;
  }

  chargeGauge(playerId, gauge) {
    let sub = this.serverState.submarines.find(s => s.xo === playerId);
    if (sub && sub.submarineState === 'doingPostMovementActions') {
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
              sub.submarineState = 'waitingForAction';
            }

          }
        }
      }
    }

    this.serverState.version++;
  }

  crossOffSystem(playerId, direction, slotId, gameOverCallback) {
    let sub = this.serverState.submarines.find(s => s.eng === playerId);
    if (sub && sub.submarineState === 'doingPostMovementActions') {
      let stateData = sub.submarineStateData[sub.submarineState];
      if (!stateData.engineerCrossedOutSystem && direction === stateData.directionMoved) {
        let slotAlreadyCrossedOut = sub.engineLayout.crossedOutSlots.some(slot => slot.direction === direction && slot.slotId === slotId);
        if (!slotAlreadyCrossedOut) {
          sub.engineLayout.crossedOutSlots.push({direction, slotId});
          stateData.engineerCrossedOutSystem = true;

          if (stateData.xoChargedGauge && stateData.engineerCrossedOutSystem) {
            // Reset for the future.
            stateData.engineerCrossedOutSystem = false;
            stateData.xoChargedGauge = false;
            // Change state.
            sub.submarineState = 'waitingForAction';
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
            let winner = this.serverState.submarines.find(s => s.id !== sub.id).id;
            gameOverCallback(winner)
            this.serverState.currentState = 'lobby';
          }

        }
      }
    }

    this.serverState.version++;
  }

  addPlayer(playerId) {
    let playerNumber = 1;
    while (Object.values(this.usedPlayerNumbers).some(usedNumber => playerNumber === usedNumber))
      playerNumber++;
    this.usedPlayerNumbers[playerId] = playerNumber;
    
    const playerName = `Player ${playerNumber}`;
    this.serverState.players.push({
      id: playerId,
      name: playerName,
      connectionOrder: Date.now(),
      ready: false,
    });

    if (!this.serverState.adminId) this.serverState.adminId = playerId;

    this.serverState.version++;
  }
}