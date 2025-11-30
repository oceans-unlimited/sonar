import { initializeServerState, createAndRunServer } from "./server.lib.js";

createAndRunServer(initializeServerState(), 3000);
