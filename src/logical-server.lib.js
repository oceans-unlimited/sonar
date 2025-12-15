import { EngineLayoutGenerator } from "./engineLayout.lib.js";
import { generateBoard } from "./board-layout.lib.js";
import { W as WATER, L as LAND } from "./board-layout.lib.js";

export class LogicalServer {
  usedPlayerNumbers = {};
  state = {
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
    this.state.players = this.state.players.filter(p => p.id !== playerId);
    // Remove from ready list
    this.state.ready = this.state.ready.filter(id => id !== playerId);
    // Vacate any roles held by this player
    this.state.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );
    if (this.state.adminId && this.state.adminId === playerId) {
      this.state.adminId = null;
    }
    this.state.version++;
  }

  changeName(playerId, new_name) {
    if (this.state.currentState !== "lobby") return;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;
    player.name = new_name;
    this.state.version++;
  }

  selectRole(playerId, submarine, role) {
    if (this.state.currentState !== "lobby") return;

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
    if (this.state.currentState !== "lobby") return;

    this.state.submarines.forEach(submarine =>
      Object.keys(submarine).forEach(role => {
        if (submarine[role] === playerId) submarine[role] = null;
      })
    );

    this.state.ready = this.state.ready.filter(id => id !== playerId);

    this.state.version++;
  }

  ready(playerId, allRolesReadyCallback, gameStartedCallback) {
    if (this.state.currentState !== "lobby") return;

    if (this.state.submarines.some(sub =>
      Object.keys(sub).some(role => sub[role] === playerId)
    ) && !this.state.ready.includes(playerId)) {
      this.state.ready.push(playerId);
    }

    const allRolesAreReady = this.state.submarines.every(sub =>
      ['co','xo','sonar','eng'].every(rk => this.state.ready.includes(sub[rk]))
    );
    if (allRolesAreReady && this.state.currentState === "lobby") {
      allRolesReadyCallback();
      this.state.currentState = "game_beginning";
      this.state.version++;
      setTimeout(() => {
        this.state.currentState = "in_game";
        const engineLayoutGenerator = new EngineLayoutGenerator();
        this.state.submarines.forEach(sub => {
          sub.engineLayout = engineLayoutGenerator.generateLayout();
        });
        this.state.board = generateBoard();
        this.state.gameState = "choosingStartPositions";
        this.state.version++;
        gameStartedCallback();
      }, 3000);
    }

    this.state.version++;
  }

  notReady(playerId) {
    if (this.state.currentState !== "lobby")
      return;

    this.state.ready = this.state.ready.filter(id => id !== playerId);
    this.state.version++;
  }

  chooseInitialPosition(playerId, row, column, resumingRealtimePlayCallback) {
    let sub = this.state.submarines.find(sub => sub.co === playerId);
    if (sub && this.state.gameState === 'choosingStartPositions') {
      let subIdsThatHaveChosen = this.state.gameStateData[this.state.gameState].submarineIdsWithStartPositionChosen;
      let thisSubAlreadyChose = subIdsThatHaveChosen.find(s => s === sub.id);
      if (!thisSubAlreadyChose) {
        let chosenPositionIsValid = 0 <= row && row <= this.state.board.length &&
            0 <= column && column <= this.state.board[0].length;
        if (chosenPositionIsValid && this.state.board[row][column] === WATER) {
          sub.row = row;
          sub.col = column;
          this.state.gameStateData[this.state.gameState].submarineIdsWithStartPositionChosen.push(sub.id);

          let allSubsHaveChosen = this.state.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
          let readyPlayers = this.state.gameStateData[this.state.gameState].playerIdsReadyToContinue;
          let allPlayersAreReady = this.state.submarines.every(s => readyPlayers.some(r => r === s.co) && readyPlayers.some(r => r === s.xo) && readyPlayers.some(r => r === s.eng) && readyPlayers.some(r => r === s.sonar));
          if (allSubsHaveChosen && allPlayersAreReady) {
            setTimeout(() => {
              this.state.gameState = 'realTimePlay';
              this.state.gameStateData.choosingStartPositions = {
                playerIdsReadyToContinue: [],
                submarineIdsWithStartPositionChosen: [],
              };

              this.state.version++;
              resumingRealtimePlayCallback();
            }, 3000);
          }
        }
      }
    }

    this.state.version++;
  }

  readyToResumeRealTimePlay(playerId, resumingRealTimePlayCallback) {
    if (this.state.gameState !== 'realTimePlay') {
      let stateName = Object.keys(this.state.gameStateData).find(k => k === this.state.gameState);
      if (stateName) {
        let playersReady = this.state.gameStateData[stateName].playerIdsReadyToContinue;
        let playerAlreadyIndicatedReadiness = playersReady.some(r => r === playerId);
        if (!playerAlreadyIndicatedReadiness) {
          playersReady.push(playerId);

          let subIdsThatHaveChosen = this.state.gameStateData[this.state.gameState].submarineIdsWithStartPositionChosen;
          let allSubsHaveChosen = this.state.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
          let readyPlayers = this.state.gameStateData[this.state.gameState].playerIdsReadyToContinue;
          let allPlayersAreReady = this.state.submarines.every(s => readyPlayers.some(r => r === s.co) && readyPlayers.some(r => r === s.xo) && readyPlayers.some(r => r === s.eng) && readyPlayers.some(r => r === s.sonar));
          if (allSubsHaveChosen && allPlayersAreReady) {
            setTimeout(() => {
              this.state.gameState = 'realTimePlay';
              this.state.gameStateData.choosingStartPositions = {
                playerIdsReadyToContinue: [],
                submarineIdsWithStartPositionChosen: [],
              };
              this.state.version++;
              resumingRealTimePlayCallback();
            }, 3000);
          }
        }
      }
    }

    this.state.version++;
  }

  move(playerId, direction) {
    if (this.state.currentState !== 'in_game')
      return;

    if (this.state.gameState !== 'realTimePlay')
      return;

    let movingSub = this.state.submarines.find(sub => sub.co === playerId);
    if (movingSub && movingSub.submarineState === 'waitingForAction') {
      const rowDeltas = {N: -1, S: 1, E: 0, W:  0};
      const colDeltas = {N:  0, S: 0, E: 1, W: -1};
      if (direction == 'N' || direction == 'S' || direction == 'E' || direction == 'W') {
        let newRow = movingSub.row + rowDeltas[direction];
        let newCol = movingSub.col + colDeltas[direction];
        if (0 <= newRow && newRow <= this.state.board.length &&
            0 <= newCol && newCol <= this.state.board[0].length &&
            this.state.board[newRow][newCol] === WATER) {
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

    this.state.version++;
  }

  chargeGauge(playerId, gauge) {
    let sub = this.state.submarines.find(s => s.xo === playerId);
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

    this.state.version++;
  }

  crossOffSystem(playerId, direction, slotId, gameOverCallback) {
    let sub = this.state.submarines.find(s => s.eng === playerId);
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
            let winner = this.state.submarines.find(s => s.id !== sub.id).id;
            gameOverCallback(winner)
            this.state.currentState = 'lobby';
          }

        }
      }
    }

    this.state.version++;
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
}