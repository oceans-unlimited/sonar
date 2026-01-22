import { createAndRunServer } from "./server.lib.js";
import { LogicalServer } from "./logical-server.lib.js";

createAndRunServer(new LogicalServer(), 3000);
