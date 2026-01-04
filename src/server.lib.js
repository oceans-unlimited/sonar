import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { LogicalServer } from './logical-server.lib.js';
import { GlobalPhases } from './constants.js';

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export function createAndRunServer(/**@type {LogicalServer} */ logicalServer, port) {
  const app = express();
  // Serve a simple static index.html for client.
  app.use(express.static("public"));
  app.use('/node_modules', express.static('node_modules'));
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer);

  // Define server-side logic for web socket connections.
  ioServer.on("connection", (socket) => {

    socket.on("disconnect", () => {
      log(`Player disconnected: ${socket.id}`);

      const wasInGame = logicalServer.state.phase === 'LIVE' || logicalServer.state.phase === 'INTERRUPT';
      logicalServer.disconnect(socket.id);

      if (wasInGame) {
        log('Broadcasting player disconnect interrupt');
        // The logicalServer.disconnect should have set the interrupt state
      }

      log('Broadcasting state update after disconnect');
      ioServer.emit("state", logicalServer.state);
    });


    socket.on("change_name", new_name => {
      log(`Player ${socket.id} changed name to ${new_name}`);

      logicalServer.changeName(socket.id, new_name);

      log('Broadcasting state update after name change');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("select_role", ({ submarine, role }) => {
      logicalServer.selectRole(socket.id, submarine, role);
      log('Broadcasting state update after role selection');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("leave_role", () => {
      log(`Player ${socket.id} left their role`);
      logicalServer.leaveRole(socket.id);
      log('Broadcasting state update after leaving role');
      ioServer.emit("state", logicalServer.state);
    })

    socket.on("ready", () => {
      log(`Player ${socket.id} is ready`);

      logicalServer.ready(socket.id);
      if (logicalServer.state.phase === GlobalPhases.GAME_BEGINNING) {
        log('All roles are ready, starting game',);
        setTimeout(() => {
          log('Broadcasting state update: in_game, choosingStartPositions');
          logicalServer.startGame();
          ioServer.emit("state", logicalServer.state);
        }, 3000);
      }

      log('Broadcasting state update after ready');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("not_ready", () => {
      log(`Player ${socket.id} is not ready`);
      logicalServer.notReady(socket.id);
      log('Broadcasting state update after not ready');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("choose_initial_position", ({ row, column }) => {
      let columnLetter = String.fromCharCode('A'.charCodeAt(0) + column);
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to chose initial position row ${row}, column ${columnLetter} (${column}).`);

      let allSubsHaveChosen = logicalServer.chooseInitialPosition(socket.id, row, column);
      if (allSubsHaveChosen) {
        setTimeout(() => {
          logicalServer.resumeFromInterrupt();
          log('Resuming real-time play; broadcasting state.');
          ioServer.emit("state", logicalServer.state);
        }, 3000);
      }

      log('Broadcasting state update after attempt to choose initial position');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("ready_interrupt", () => {
      log(`Player ${logicalServer.playerName(socket.id)} is ready for interrupt resolution`);
      let shouldResumeFromInterrupt = logicalServer.readyInterrupt(socket.id);
      if (shouldResumeFromInterrupt) {
        setTimeout(() => {
          logicalServer.resumeFromInterrupt();
          log('Resuming play after interrupt; broadcasting state.');
          ioServer.emit("state", logicalServer.state);
        }, 3000);
      }
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("request_pause", () => {
      log(`Player ${logicalServer.playerName(socket.id)} requested pause`);
      logicalServer.requestPause(socket.id);
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("sonar", () => {
      log(`Player ${logicalServer.playerName(socket.id)} did sonar: ${response}`);
      logicalServer.sonar(socket.id);
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("submit_sonar_response", (response) => {
      log(`Player ${logicalServer.playerName(socket.id)} submitted sonar response: ${response}`);
      logicalServer.submitSonarResponse(socket.id);
      setTimeout(() => {
        logicalServer.resumeFromInterrupt();
        log('Resuming play after sonar response; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      }, 3000);
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("move", (direction) => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to move ${direction}.`);

      logicalServer.move(socket.id, direction);

      log('Broadcasting state update after attempted movement.');
      logicalServer.state.version++;
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('charge_gauge', (gauge) => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to charge gauge ${gauge}.`);

      logicalServer.chargeGauge(socket.id, gauge);

      log('Broadcasting state update after attempt to charge gauge.');
      logicalServer.state.version++;
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('cross_off_system', ({ direction, slotId }) => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to cross off slot ${direction}, ${slotId}.`);

      logicalServer.crossOffSystem(socket.id, direction, slotId);
      if (logicalServer.state.phase === GlobalPhases.GAME_OVER) {
        log(`Winner is ${logicalServer.state.winner ?? "Nobody!"}`)
      }

      log('Broadcasting state update after attempt to cross off slot.');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('surface', () => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to surface.`);

      logicalServer.surface(socket.id);

      log('Broadcasting state update after attempt to complete .');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('complete_surfacing_task', () => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to surface.`);

      let subName = logicalServer.getSubName(socket.id);
      let canSubmerge = logicalServer.completeSurfacingTask(socket.id);
      if (canSubmerge) {
        log(`Submarine ${subName} ready to submerge.`);
      }

      log('Broadcasting state update after attempt to surface.');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('submerge', () => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to submerge.`);

      logicalServer.submerge(socket.id);

      log('Broadcasting state update after attempt to submerge.');
      ioServer.emit("state", logicalServer.state);
    })

    socket.on('silence', ({/**@type {'N' | 'S' | 'E' | 'W'} */ direction, /**@type {number} */ spaces}) => {
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted silence.`);

      logicalServer.silence(socket.id, direction, spaces);
      
      log('Broadcasting state update after silence attempt.');
      ioServer.emit("state", logicalServer.state);
    });

    logicalServer.addPlayer(socket.id);

    log(`Player connected: ${socket.id} (${logicalServer.playerName(socket.id)})`);
    socket.emit("player_id", socket.id);
    ioServer.emit("state", logicalServer.state);
  });

  // Start and return the actual server.
  httpServer.listen(port, () => {
    console.log(`SocketIoServer running at http://localhost:${port}`);
  });
  return httpServer;
}