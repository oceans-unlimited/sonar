
import { LogicalServer } from '../src/logical-server.lib.js';
import { GlobalPhases, InterruptTypes, SubmarineStates } from '../src/constants.js';

describe('Movement Loop E2E', () => {
    let server;
    const p1 = 'player-1';
    const p2 = 'player-2';
    const p3 = 'player-3';
    const p4 = 'player-4';
    const p5 = 'player-5';
    const p6 = 'player-6';
    const p7 = 'player-7';
    const p8 = 'player-8';

    beforeEach(() => {
        server = new LogicalServer();
        // Setup 2 full teams
        [p1, p2, p3, p4, p5, p6, p7, p8].forEach(id => server.addPlayer(id));

        // Team A (Sub 0)
        server.selectRole(p1, 0, 'co');
        server.selectRole(p2, 0, 'xo');
        server.selectRole(p3, 0, 'sonar');
        server.selectRole(p4, 0, 'eng');

        // Team B (Sub 1)
        server.selectRole(p5, 1, 'co');
        server.selectRole(p6, 1, 'xo');
        server.selectRole(p7, 1, 'sonar');
        server.selectRole(p8, 1, 'eng');

        // Ready up all
        [p1, p2, p3, p4, p5, p6, p7, p8].forEach(id => server.ready(id, () => { }, () => { }));
    });

    test('Full movement loop: CO move -> XO/ENG action -> CO move', () => {
        // 1. Setup initial positions
        server.chooseInitialPosition(p1, 5, 5); // Sub A
        server.chooseInitialPosition(p5, 10, 10); // Sub B

        // All ready interrupt
        [p1, p2, p3, p4, p5, p6, p7, p8].forEach(id => server.readyInterrupt(id, () => { }));

        expect(server.state.phase).toBe(GlobalPhases.LIVE);

        const subA = server.state.submarines[0];
        expect(subA.row).toBe(5);
        expect(subA.col).toBe(5);
        expect(subA.submarineState).toBe(SubmarineStates.SUBMERGED);
        expect(subA.pastTrack).toContainEqual({ row: 5, col: 5 });

        // 2. CO moves North
        server.move(p1, 'N');
        expect(subA.row).toBe(4);
        expect(subA.col).toBe(5);
        expect(subA.submarineState).toBe(SubmarineStates.POST_MOVEMENT);
        expect(subA.submarineStateData[SubmarineStates.POST_MOVEMENT].directionMoved).toBe('N');
        expect(subA.pastTrack).toContainEqual({ row: 4, col: 5 });

        // 3. Try to move again while in POST_MOVEMENT (should fail)
        server.move(p1, 'N');
        expect(subA.row).toBe(4); // Still at 4

        // 4. XO charges gauge
        server.chargeGauge(p2, 'torpedo');
        expect(subA.actionGauges.torpedo).toBe(1);
        expect(subA.submarineStateData[SubmarineStates.POST_MOVEMENT].xoChargedGauge).toBe(true);
        // Sub should still be in POST_MOVEMENT until ENG acts
        expect(subA.submarineState).toBe(SubmarineStates.POST_MOVEMENT);

        // 5. ENG crosses off (wrong direction)
        server.crossOffSystem(p4, 'S', 0, () => { });
        expect(subA.submarineStateData[SubmarineStates.POST_MOVEMENT].engineerCrossedOutSystem).toBe(false);

        // 6. ENG crosses off (correct direction)
        server.crossOffSystem(p4, 'N', 0, () => { });
        expect(subA.submarineStateData[SubmarineStates.POST_MOVEMENT].engineerCrossedOutSystem).toBe(true);

        // Both done -> Sub should be SUBMERGED again
        expect(subA.submarineState).toBe(SubmarineStates.SUBMERGED);

        // 7. CO moves West (90 degree turn)
        server.move(p1, 'W');
        expect(subA.row).toBe(4);
        expect(subA.col).toBe(4);
        expect(subA.submarineState).toBe(SubmarineStates.POST_MOVEMENT);

        // 8. Try to move South (90 degree turn from West)
        // Finish loop first
        server.chargeGauge(p2, 'torpedo');
        server.crossOffSystem(p4, 'W', 0, () => { });
        expect(subA.submarineState).toBe(SubmarineStates.SUBMERGED);

        // Current pos: (4, 4). Last move: West.
        // Try to move East (opposite of West)
        server.move(p1, 'E');
        expect(subA.col).toBe(4); // Should stay at 4

        // Try to move South (valid)
        server.move(p1, 'S');
        expect(subA.row).toBe(5);
        expect(subA.col).toBe(4);

        // Try to move East (into path (5,5) - chosen start)
        // Finish loop first
        server.chargeGauge(p2, 'torpedo');
        server.crossOffSystem(p4, 'S', 0, () => { });

        server.move(p1, 'E');
        expect(subA.col).toBe(4); // Should not move to (5,5) as it's in pastTrack
    });
});
