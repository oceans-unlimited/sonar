import { PLAYER_ROLES, SUBMARINE_STATES } from '../shared/engineMockData.js';

/**
 * Scenario: Submarine Pristine Logic Test
 * Boots into SubmarineTestScene and runs a series of logic method tests.
 */
export default {
    name: 'Submarine - Logic Verification',
    scene: 'submarineTest',
    playerId: PLAYER_ROLES.CO,

    initialState: {
        phase: 'LIVE',
        submarines: [
            {
                id: 'A',
                name: 'Vessel A',
                co: PLAYER_ROLES.CO,
                health: 4,
                submarineState: 'SUBMERGED',
                row: 7,
                col: 7,
                sector: 5,
                actionGauges: { sonar: 3, torpedo: 0 },
                submarineStateData: {
                    MOVED: { directionMoved: ' ', engineerCrossedOutSystem: false, xoChargedGauge: false }
                }
            }
        ]
    },

    timeline: [
        // 1. Initial Identity Check
        { type: 'delay', ms: 1000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'RUN_METHOD_TEST', label: 'OWN_SHIP_CHECK', method: 'isOwnship', args: [PLAYER_ROLES.CO] }
        },

        // 2. State Check
        { type: 'delay', ms: 3000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'RUN_METHOD_TEST', label: 'CURRENT_STATE', method: 'getState' }
        },

        // 3. Move Gating Check
        { type: 'delay', ms: 3000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'RUN_METHOD_TEST', label: 'CAN_MOVE_QUERY', method: 'canMove' }
        },

        // 4. Weapon Gating Check (Sonar is full in mock)
        { type: 'delay', ms: 3000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'RUN_METHOD_TEST', label: 'CAN_FIRE_SONAR', method: 'canFire', args: ['sonar'] }
        },

        // 5. Weapon Gating Check (Torpedo is empty in mock)
        { type: 'delay', ms: 3000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'RUN_METHOD_TEST', label: 'CAN_FIRE_TORPEDO', method: 'canFire', args: ['torpedo'] }
        },

        // 6. Formatted Facts Check
        { type: 'delay', ms: 3000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'RUN_METHOD_TEST', label: 'POSITION_FACT', method: 'getPosition' }
        },

        // 7. Status Message Check
        { type: 'delay', ms: 3000 },
        {
            type: 'DIRECTOR_CMD',
            data: { type: 'LOG_TO_TERMINAL', text: '>> SEQUENCE COMPLETE. LOGIC VERIFIED.', color: 0x00FF00 }
        }
    ]
};
