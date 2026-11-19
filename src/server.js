import { InterruptTypes } from "./constants.js";
import { createAndRunServer } from "./server.lib.js";
import { LogicalServer } from "./logical-server.lib.js";

const dummyPlayers = ['player1', 'player2', 'player3', 'player4', 'player5'];
const server = new LogicalServer();
createAndRunServer(server, 3000);
dummyPlayers.forEach(player => server.addPlayer(player));

server.selectRole('player1', 0, 'co');
server.selectRole('player2', 0, 'xo');
server.selectRole('player3', 0, 'eng');
server.selectRole('player4', 0, 'sonar');
server.selectRole('player5', 1, 'sonar');
dummyPlayers.forEach(player => server.ready(player));

const timer = setInterval(() => {
    if (!server.isInterrupt(InterruptTypes.START_POSITIONS)) return;
    clearInterval(timer);

    server.chooseInitialPosition('player1', 7, 7);
    const sub = server.getSub('player1');
    if (sub.row !== 7 || sub.col !== 7) console.warn(`Hard Start for Sub A failed`);;
    server.readyInterrupt('player1');
}, 500);
