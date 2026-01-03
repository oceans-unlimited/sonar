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

      logicalServer.ready(
        socket.id,
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
      log(`Player ${socket.id} is not ready`);
      logicalServer.notReady(socket.id);
      log('Broadcasting state update after not ready');
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("choose_initial_position", ({ row, column }) => {
      let columnLetter = String.fromCharCode('A'.charCodeAt(0) + column);
      log(`Player ${logicalServer.playerName(socket.id)} (${socket.id}) attempted to chose initial position row ${row}, column ${columnLetter} (${column}).`);

      logicalServer.chooseInitialPosition(
        socket.id,
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
      log(`Player ${logicalServer.playerName(socket.id)} is ready to resume real-time play (Legacy)`);

      logicalServer.readyToResumeRealTimePlay(socket.id, () => {
        log('Resuming real-time play; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      });

      log('Broadcasting state update after player indicated readiness for real-time play')
      logicalServer.state.version++;
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("ready_interrupt", () => {
      log(`Player ${logicalServer.playerName(socket.id)} is ready for interrupt resolution`);
      logicalServer.readyInterrupt(socket.id, () => {
        log('Resuming play after interrupt; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      });
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("request_pause", () => {
      log(`Player ${logicalServer.playerName(socket.id)} requested pause`);
      logicalServer.requestPause(socket.id);
      ioServer.emit("state", logicalServer.state);
    });

    socket.on("submit_sonar_response", (response) => {
      log(`Player ${logicalServer.playerName(socket.id)} submitted sonar response: ${response}`);
      logicalServer.submitSonarResponse(socket.id, response, () => {
        log('Resuming play after sonar response; broadcasting state.');
        ioServer.emit("state", logicalServer.state);
      });
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

      logicalServer.crossOffSystem(socket.id, direction, slotId, winner => ioServer.emit("game_won", winner));

      log('Broadcasting state update after attempt to cross off slot.');
      logicalServer.state.version++;
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