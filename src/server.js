import { createAndRunServer } from "./server.lib.js";
import { LogicalServer } from "./logical-server.lib.js";

const server = createAndRunServer(new LogicalServer(), 5173);
server.addPlayer("Player1");
server.addPlayer("Player2");
server.addPlayer("Player3");
server.addPlayer("Player4");
server.addPlayer("Player5");