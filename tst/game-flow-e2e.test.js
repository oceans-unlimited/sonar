import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAndRunServer } from '../src/server.lib.js';
import { LogicalServer } from '../src/logical-server.lib.js';
import { GlobalPhases, InterruptTypes, SubmarineStates } from '../src/constants.js';

import {
    create8Clients,
    disconnectAll,
    selectRole,
    ready,
    sleep,
    chooseInitialPosition,
    readyInterrupt,
    move,
    chargeGauge,
    crossOffSystem
} from './test-helpers.js';


describe('Game Flow E2E (START_POSITIONS)', () => {
    let server = null;
    let clients = [];
    let playerIds = [];
    const roles = ['co', 'xo', 'eng', 'sonar'];

    beforeEach(async () => {
        const logicalServer = new LogicalServer();
        server = createAndRunServer(logicalServer, 0);
        const port = server.address().port;
        const serverUrl = `http://localhost:${port}`;

        const result = await create8Clients(serverUrl, { forceNew: true });
        clients = result.clients;
        playerIds = result.playerIds;
    });

    afterEach(async () => {
        disconnectAll(clients);
        if (server) await new Promise(resolve => server.close(resolve));
    });

    it('should complete the full flow from Lobby through START_POSITIONS to LIVE', { timeout: 30000 }, async () => {
        let state = null;
        clients[0].on('state', (s) => { state = s; });

        for (let i = 0; i < 4; i++) await selectRole(clients[i], 0, roles[i]);
        for (let i = 0; i < 4; i++) await selectRole(clients[i + 4], 1, roles[i]);

        await sleep(200);
        for (const client of clients) await ready(client);

        await expect.poll(() => state?.phase, { timeout: 5000 }).toBe(GlobalPhases.INTERRUPT);
        expect(state.activeInterrupt.type).toBe(InterruptTypes.START_POSITIONS);

        // 5. Captain A selects a position (5,5 is Water)
        await chooseInitialPosition(clients[0], 5, 5);
        await expect.poll(() => state?.submarines[0].row, { timeout: 2000 }).toBe(5);

        // 6. Captain A confirms
        await readyInterrupt(clients[0]);
        await expect.poll(() => state?.ready, { timeout: 2000 }).toContain('player-0');

        // 7. UNDO: Captain A changes to (6,12 - Water) -> Verify UNREADY
        await chooseInitialPosition(clients[0], 6, 12);
        await expect.poll(() => state?.submarines[0].row, { timeout: 2000 }).toBe(6);
        expect(state.ready).not.toContain('player-0');

        // 8. Captain A re-confirms
        await readyInterrupt(clients[0]);
        await expect.poll(() => state?.ready, { timeout: 2000 }).toContain('player-0');

        // 9. Captain B (p-4) selects and confirms
        await chooseInitialPosition(clients[4], 10, 10);
        await expect.poll(() => state?.submarines[1].row, { timeout: 2000 }).toBe(10);
        await readyInterrupt(clients[4]);

        // 10. Transition to LIVE
        await expect.poll(() => state?.phase, { timeout: 5000 }).toBe(GlobalPhases.LIVE);

        // 11. Basic Movement (LIVE phase)
        expect(state.submarines[0].submarineState).toBe(SubmarineStates.SUBMERGED);

        const startRow = state.submarines[0].row;

        await move(clients[0], 'N');
        await expect.poll(() => state?.submarines[0].submarineState, { timeout: 2000 }).toBe(SubmarineStates.POST_MOVEMENT);
        expect(state.submarines[0].row).toBe(startRow - 1);

        // Sub A: XO (clients[1]) charges gauge, Eng (clients[2]) crosses off system
        await chargeGauge(clients[1], 'silence');
        await crossOffSystem(clients[2], 'N', 'slot01');

        await expect.poll(() => state?.submarines[0].submarineState, { timeout: 2000 }).toBe(SubmarineStates.SUBMERGED);
        expect(state.submarines[0].actionGauges.silence).toBe(1);

    });


    it('should ignore LAND coordinates for START_POSITIONS', { timeout: 20000 }, async () => {
        let state = null;
        clients[0].on('state', (s) => { state = s; });

        for (let i = 0; i < 4; i++) await selectRole(clients[i], 0, roles[i]);
        for (let i = 0; i < 4; i++) await selectRole(clients[i + 4], 1, roles[i]);
        for (let i = 0; i < 8; i++) await ready(clients[i]);

        await expect.poll(() => state?.phase, { timeout: 5000 }).toBe(GlobalPhases.INTERRUPT);
        const originalRow = state.submarines[0].row;

        // Row 1, Col 2 is LAND
        await chooseInitialPosition(clients[0], 1, 2);
        await sleep(500);
        expect(state.submarines[0].row).toBe(originalRow);
    });
});
