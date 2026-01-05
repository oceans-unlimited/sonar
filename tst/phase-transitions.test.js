import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAndRunServer } from '../src/server.lib.js';
import { LogicalServer } from '../src/logical-server.lib.js';
import { GlobalPhases, InterruptTypes } from '../src/constants.js';
import {
    create8Clients,
    disconnectAll,
    selectRole,
    ready,
    sleep
} from './test-helpers.js';

const PORT = 3003;

describe('Server Phase Transitions', {skip: true}, () => {
    let server = null;
    let clients = [];
    let playerIds = [];

    beforeEach(async () => {
        const logicalServer = new LogicalServer();
        server = createAndRunServer(logicalServer, 0);
        const port = server.address().port;
        const serverUrl = `http://localhost:${port}`;

        const result = await create8Clients(serverUrl, { autoConnect: false, forceNew: true });
        clients = result.clients;
        playerIds = result.playerIds;
    });

    afterEach(async () => {
        disconnectAll(clients);
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    it('should flow through LOBBY -> GAME_BEGINNING -> INTERRUPT (START_POSITIONS) -> LIVE', { timeout: 15000 }, async () => {
        // 1. Initial state: LOBBY
        let state = null;
        clients[0].on('state', (s) => { state = s; });

        // Connect all clients now that we have registered the listener
        for (const client of clients) {
            client.connect();
        }

        // Use poll to wait for the first state emission
        await expect.poll(() => state, { timeout: 2000 }).toBeTruthy();
        expect(state.phase).toBe(GlobalPhases.LOBBY);

        // 2. Assign all roles
        await selectRole(clients[0], 0, 'co');
        await selectRole(clients[1], 0, 'xo');
        await selectRole(clients[2], 0, 'eng');
        await selectRole(clients[3], 0, 'sonar');
        await selectRole(clients[4], 1, 'co');
        await selectRole(clients[5], 1, 'xo');
        await selectRole(clients[6], 1, 'eng');
        await selectRole(clients[7], 1, 'sonar');
        await sleep(200);

        // 3. Ready all
        for (const client of clients) {
            await ready(client);
        }

        // 4. Verify GAME_BEGINNING
        await expect.poll(() => state, { timeout: 1000 })
            .toSatisfy((s) => s.phase === GlobalPhases.GAME_BEGINNING);

        // 5. Wait for transition to INTERRUPT (START_POSITIONS)
        // Server uses 3000ms timeout
        await expect.poll(() => state, { timeout: 4000 })
            .toSatisfy((s) =>
                s.phase === GlobalPhases.INTERRUPT &&
                s.activeInterrupt?.type === InterruptTypes.START_POSITIONS
            );

        // 6. Captains choose positions
        clients[0].emit('choose_initial_position', { row: 5, column: 5 }); // Sub A
        clients[4].emit('choose_initial_position', { row: 10, column: 10 }); // Sub B

        // 7. Verify LIVE phase
        // Server uses 3000ms timeout after both captains choose
        await expect.poll(() => state, { timeout: 4000 })
            .toSatisfy((s) => s.phase === GlobalPhases.LIVE && s.activeInterrupt === null);
    });
});
