import io from 'socket.io-client';
import {initializeServerState, createAndRunServer} from '../src/server.js';

test('asserts true', async () => {
  const state = initializeServerState();
  createAndRunServer(state);
  const socket = io("http://localhost:3000");

  const emittedStatePromise = new Promise(value => value);
  socket.on("state", state => {
    emittedState.push(Object.values(state.subs)[0]);
  });
  socket.emit("move", "N");
  
});
