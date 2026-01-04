import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export function createAndRunServer(logicalServer, port) {
  const app = express();
  // Serve a simple static index.html for client.
  app.use(express.static("public"));
  app.use('/node_modules', express.static('node_modules'));
  const httpServer = http.createServer(app);
  const ioServer = new SocketIoServer(httpServer);

  // Define server-side logic for web socket connections.
  ioServer.on("connection", (socket) => {
    // Use persistent playerId if provided (e.g., from localStorage on Pi/Client), else fallback to socket.id
    const playerId = socket.handshake.auth?.playerId || socket.id;

    socket.on("disconnect", () => {
      log(`Player disconnected: ${playerId} (socket: ${socket.id})`);

      const wasInGame = logicalServer.state.phase === 'LIVE' || logicalServer.state.phase === 'INTERRUPT';
      logicalServer.disconnect(playerId);

      if (wasInGame) {
        log('Broadcasting player disconnect interrupt');
        // The logicalServer.disconnect should have set the interrupt state
      }

      log('Broadcasting state update after disconnect');
      ioServer.emit("state", logicalServer.state);
    });


    socket.on("change_name", new_name => {
      log(`Player ${playerId} changed name to ${new_name}`);

      logicalServer.changeName(playerId, new_name);

      log('Broadcasting state update after name change');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("select_role", ({ submarine, role }) => {
      logicalServer.selectRole(playerId, submarine, role);
      log('Broadcasting state update after role selection');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("leave_role", () => {
      log(`Player ${playerId} left their role`);
      logicalServer.leaveRole(playerId);
      log('Broadcasting state update after leaving role');
      ioServer.emit("state", logicalServer.state);
    })

    socket.on("ready", () => {
      log(`Player ${playerId} is ready`);

      logicalServer.ready(
        playerId,
        () => log('All roles are ready, starting game',),
        () => {
          log('Broadcasting state update: in_game, choosingStartPositions');
          ioServer.emit("state", logicalServer.state);
        }
      );

      log('Broadcasting state update after ready');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("not_ready", () => {
      log(`Player ${playerId} is not ready`);
      logicalServer.notReady(playerId);
      log('Broadcasting state update after not ready');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("choose_initial_position", ({ row, column }) => {
      log(`Player ${logicalServer.playerName(playerId)} (${playerId}) chose initial position (${row}, ${column}).`);

      logicalServer.chooseInitialPosition(
        playerId,
        row,
        column,
        () => {
          log('Resuming real-time play; broadcasting state.');
          ioServer.emit("state", logicalServer.state);
        }
      );

      log('Broadcasting state update after attempt to choose initial position');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("ready_to_resume_real_time_play", () => {
      log(`Player ${logicalServer.playerName(playerId)} is ready to resume (Legacy)`);

      logicalServer.readyToResumeRealTimePlay(playerId, () => {
        log('Resuming real-time play; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      });

      log('Broadcasting state update after player indicated readiness for real-time play')
      logicalServer.state.version++;
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("ready_interrupt", () => {
      log(`Player ${logicalServer.playerName(playerId)} is ready for interrupt resolution`);
      logicalServer.readyInterrupt(playerId, () => {
        log('Resuming play after interrupt; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      });
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("request_pause", () => {
      log(`Player ${logicalServer.playerName(playerId)} requested pause`);
      logicalServer.requestPause(playerId);
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("submit_sonar_response", (response) => {
      log(`Player ${logicalServer.playerName(playerId)} submitted sonar response: ${response}`);
      logicalServer.submitSonarResponse(playerId, response, () => {
        log('Resuming play after sonar response; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      });
      ioServer.emit("state", logicalServer.state);
    });


    socket.on("move", (direction) => {
      log(`Player ${logicalServer.playerName(playerId)} (${playerId}) attempted to move ${direction}.`);

      logicalServer.move(playerId, direction);

      log('Broadcasting state update after attempted movement.');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('charge_gauge', (gauge) => {
      log(`Player ${logicalServer.playerName(playerId)} (${playerId}) attempted to charge gauge ${gauge}.`);

      logicalServer.chargeGauge(playerId, gauge);

      log('Broadcasting state update after attempt to charge gauge.');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on('cross_off_system', ({ direction, slotId }) => {
      log(`Player ${logicalServer.playerName(playerId)} (${playerId}) attempted to cross off slot ${direction}, ${slotId}.`);

      logicalServer.crossOffSystem(playerId, direction, slotId, winner => ioServer.emit("game_won", winner));

      log('Broadcasting state update after attempt to cross off slot.');
      ioServer.emit("state", logicalServer.state);
    });

    logicalServer.addPlayer(playerId);

    log(`Player connected: ${playerId} (socket: ${socket.id})`);
    socket.emit("player_id", playerId);
    ioServer.emit("state", logicalServer.state);
  });


  // Start and return the actual server.
  httpServer.listen(port, () => {
    console.log(`SocketIoServer running at http://localhost:${port}`);
  });
  return httpServer;
}