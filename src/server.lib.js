import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { EngineLayoutGenerator } from './engineLayout.lib.js';
import { generateBoard, L as LAND, W as WATER } from './board-layout.lib.js'

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export function initializeServerState() {
  return {
    version: 0,
    currentState: "lobby",
    players: [],
    adminId: null,
    submarines: [createSubmarine('A'), createSubmarine('B')],
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
}

function createSubmarine(id) {
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

export function createAndRunServer(serverState, port) {
  let usedPlayerNumbers = {};
  const app = express();
  // Serve a simple static index.html for testing
  app.use(express.static("public"));
  app.use('/node_modules', express.static('node_modules'));
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer);

  ioServer.on("connection", (socket) => {
    
    socket.on("disconnect", () => {
      log(`Player disconnected: ${socket.id}`);
      delete usedPlayerNumbers[socket.id];
      // Remove player record
      serverState.players = serverState.players.filter(p => p.id !== socket.id);
      // Remove from ready list
      serverState.ready = serverState.ready.filter(id => id !== socket.id);
      // Vacate any roles held by this player
      serverState.submarines.forEach(submarine =>
        Object.keys(submarine).forEach(role => {
          if (submarine[role] === socket.id) submarine[role] = null;
        })
      );
      if (serverState.adminId && serverState.adminId === socket.id) {
        serverState.adminId = null;
      }
      serverState.version++;
      log('Broadcasting state update after disconnect');
      ioServer.emit("state", serverState);
    });

    socket.on("change_name", new_name => {
      log(`Player ${socket.id} changed name to ${new_name}`);
      if (serverState.currentState !== "lobby") return;

      const player = serverState.players.find(p => p.id === socket.id);
      if (!player) return;
      player.name = new_name;
      serverState.version++;
      log('Broadcasting state update after name change');
      ioServer.emit("state", serverState);
    });

    socket.on("select_role", ({submarine, role}) => {
      if (serverState.currentState !== "lobby") return;

      if (
        0 <= submarine &&
        submarine < serverState.submarines.length &&
        !serverState.submarines[submarine][role]
      ) {
        log(`Player ${socket.id} selected role ${role} on submarine ${serverState.submarines[submarine].name}`);
        // leave existing role
        serverState.submarines.forEach(submarineObj =>
          Object.keys(submarineObj).forEach(rk => {
            if (submarineObj[rk] === socket.id) submarineObj[rk] = null;
          })
        );
        // go to new role
        serverState.submarines[submarine][role] = socket.id;

        // un-ready the player
        serverState.ready = serverState.ready.filter(id => id !== socket.id);
      }
      serverState.version++;
      log('Broadcasting state update after role selection');
      ioServer.emit("state", serverState);
    });

    socket.on("leave_role", () => {
      log(`Player ${socket.id} left their role`);
      if (serverState.currentState !== "lobby") return;

      serverState.submarines.forEach(submarine =>
        Object.keys(submarine).forEach(role => {
          if (submarine[role] === socket.id) submarine[role] = null;
        })
      );

      serverState.ready = serverState.ready.filter(id => id !== socket.id);

      serverState.version++;
      log('Broadcasting state update after leaving role');
      ioServer.emit("state", serverState);
    })

    socket.on("ready", () => {
      log(`Player ${socket.id} is ready`);
      if (serverState.currentState !== "lobby") return;

      if (serverState.submarines.some(sub =>
        Object.keys(sub).some(role => sub[role] === socket.id)
      ) && !serverState.ready.includes(socket.id)) {
        serverState.ready.push(socket.id);
      }

      const allRolesAreReady = serverState.submarines.every(sub =>
        ['co','xo','sonar','eng'].every(rk => serverState.ready.includes(sub[rk]))
      );
      if (allRolesAreReady && serverState.currentState === "lobby") {
        log('All roles are ready, starting game');
        serverState.currentState = "game_beginning";
        serverState.version++;
        log('Broadcasting state update: game beginning');
        ioServer.emit("state", serverState);
        setTimeout(() => {
          log('Transitioning to in_game state');
          serverState.currentState = "in_game";
          const engineLayoutGenerator = new EngineLayoutGenerator();
          serverState.submarines.forEach(sub => {
            sub.engineLayout = engineLayoutGenerator.generateLayout();
          });
          serverState.board = generateBoard();
          serverState.gameState = "choosingStartPositions";
          serverState.version++;
          log('Broadcasting state update: in_game, choosingStartPositions');
          ioServer.emit("state", serverState);
        }, 3000);
      }

      serverState.version++;
      log('Broadcasting state update after ready');
      ioServer.emit("state", serverState);
    });

    socket.on("not_ready", () => {
      log(`Player ${socket.id} is not ready`);
      if (serverState.currentState !== "lobby")
        return;

      serverState.ready = serverState.ready.filter(id => id !== socket.id);
      serverState.version++;
      log('Broadcasting state update after not ready');
      ioServer.emit("state", serverState);
    });

    socket.on("choose_initial_position", ({row, column}) => {
      let playerName = serverState.players.find(p => p.id === socket.id).name;
      let columnLetter = String.fromCharCode('A'.charCodeAt(0) + column);
      log(`Player ${playerName} (${socket.id}) attempted to chose initial position row ${row}, column ${columnLetter} (${column}).`);

      let sub = serverState.submarines.find(sub => sub.co === socket.id);
      if (sub && serverState.gameState === 'choosingStartPositions') {
        let subIdsThatHaveChosen = serverState.gameStateData[serverState.gameState].submarineIdsWithStartPositionChosen;
        let thisSubAlreadyChose = subIdsThatHaveChosen.find(s => s === sub.id);
        if (!thisSubAlreadyChose) {
          let chosenPositionIsValid = 0 <= row && row <= serverState.board.length &&
              0 <= column && column <= serverState.board[0].length;
          if (chosenPositionIsValid && serverState.board[row][column] === WATER) {
            sub.row = row;
            sub.col = column;
            serverState.gameStateData[serverState.gameState].submarineIdsWithStartPositionChosen.push(sub.id);

            let allSubsHaveChosen = serverState.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
            let readyPlayers = serverState.gameStateData[serverState.gameState].playerIdsReadyToContinue;
            let allPlayersAreReady = serverState.submarines.every(s => readyPlayers.some(r => r === s.co) && readyPlayers.some(r => r === s.xo) && readyPlayers.some(r => r === s.eng) && readyPlayers.some(r => r === s.sonar));
            if (allSubsHaveChosen && allPlayersAreReady) {
              setTimeout(() => {
                serverState.gameState = 'realTimePlay';
                serverState.gameStateData.choosingStartPositions = {
                  playerIdsReadyToContinue: [],
                  submarineIdsWithStartPositionChosen: [],
                };
                log('Resuming real-time play; broadcasting state.');
                serverState.version++;
                ioServer.emit("state", serverState);
              }, 3000);
            }
          }
        }
      }

      log('Broadcasting state update after attempt to choose initial position');
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on("ready_to_resume_real_time_play", () => {
      let playerName = serverState.players.find(p => p.id === socket.id).name;
      log(`Player ${playerName} is ready to resume real-time play`);

      if (serverState.gameState !== 'realTimePlay') {
        let stateName = Object.keys(serverState.gameStateData).find(k => k === serverState.gameState);
        if (stateName) {
          let playersReady = serverState.gameStateData[stateName].playerIdsReadyToContinue;
          let playerAlreadyIndicatedReadiness = playersReady.some(r => r === socket.id);
          if (!playerAlreadyIndicatedReadiness) {
            playersReady.push(socket.id);

            let subIdsThatHaveChosen = serverState.gameStateData[serverState.gameState].submarineIdsWithStartPositionChosen;
            let allSubsHaveChosen = serverState.submarines.every(s => subIdsThatHaveChosen.find(c => c === s.id));
            let readyPlayers = serverState.gameStateData[serverState.gameState].playerIdsReadyToContinue;
            let allPlayersAreReady = serverState.submarines.every(s => readyPlayers.some(r => r === s.co) && readyPlayers.some(r => r === s.xo) && readyPlayers.some(r => r === s.eng) && readyPlayers.some(r => r === s.sonar));
            if (allSubsHaveChosen && allPlayersAreReady) {
              setTimeout(() => {
                serverState.gameState = 'realTimePlay';
                serverState.gameStateData.choosingStartPositions = {
                  playerIdsReadyToContinue: [],
                  submarineIdsWithStartPositionChosen: [],
                };
                log('Resuming real-time play; broadcasting state.');
                serverState.version++;
                ioServer.emit("state", serverState);
              }, 3000);
            }
          }
        }
      }

      log('Broadcasting state update after player indicated readiness for real-time play')
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on("move", (direction) => {
      let playerName = serverState.players.find(p => p.id === socket.id).name;
      log(`Player ${playerName} (${socket.id}) attempted to move ${direction}.`);
      
      if (serverState.currentState !== 'in_game')
        return;

      if (serverState.gameState !== 'realTimePlay')
        return;

      let movingSub = serverState.submarines.find(sub => sub.co === socket.id);
      if (movingSub && movingSub.submarineState === 'waitingForAction') {
        const rowDeltas = {N: -1, S: 1, E: 0, W:  0};
        const colDeltas = {N:  0, S: 0, E: 1, W: -1};
        if (direction == 'N' || direction == 'S' || direction == 'E' || direction == 'W') {
          let newRow = movingSub.row + rowDeltas[direction];
          let newCol = movingSub.col + colDeltas[direction];
          if (0 <= newRow && newRow <= serverState.board.length &&
              0 <= newCol && newCol <= serverState.board[0].length &&
              serverState.board[newRow][newCol] === WATER) {
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

      log('Broadcasting state update after attempted movement.');
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on('charge_gauge', (gauge) => {
      let playerName = serverState.players.find(p => p.id === socket.id).name;
      log(`Player ${playerName} (${socket.id}) attempted to charge gauge ${gauge}.`);

      let sub = serverState.submarines.find(s => s.xo === socket.id);
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

      log('Broadcasting state update after attempt to charge gauge.');
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    socket.on('cross_off_system', ({direction, slotId}) => {
      let playerName = serverState.players.find(p => p.id === socket.id).name;
      log(`Player ${playerName} (${socket.id}) attempted to cross off slot ${direction}, ${slotId}.`);

      let sub = serverState.submarines.find(s => s.eng === socket.id);
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
              ioServer.emit("game_won", serverState.submarines.find(s => s.id !== sub.id).id);
              serverState.currentState = 'lobby';
            }

          }
        }
      }

      log('Broadcasting state update after attempt to cross off slot.');
      serverState.version++;
      ioServer.emit("state", serverState);
    });

    let playerNumber = 1;
    while (Object.values(usedPlayerNumbers).some(usedNumber => playerNumber === usedNumber))
      playerNumber++;
    usedPlayerNumbers[socket.id] = playerNumber;
    
    const playerName = `Player ${playerNumber}`;
    serverState.players.push({
      id: socket.id,
      name: playerName,
      connectionOrder: Date.now(),
      ready: false,
    });

    if (!serverState.adminId) serverState.adminId = socket.id;

    log(`Player connected: ${socket.id} (${playerName})`);
    socket.emit("player_id", socket.id);
    serverState.version++;
    log('Broadcasting state update after new connection');
    ioServer.emit("state", serverState);

    console.log(`Player connected: ${socket.id}`);
  });

  httpServer.listen(port, () => {
    console.log(`SocketIoServer running at http://localhost:${port}`);
  });

  return httpServer;
}