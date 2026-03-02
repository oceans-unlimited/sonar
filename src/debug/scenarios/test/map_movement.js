import { createMockSubmarineState, PLAYER_ROLES } from '../shared/engineMockData.js';

/**
 * map_movement
 * Test scenario for automated position updates and auto-centering.
 * Simulates a series of server-emitted state updates.
 */
export default {
    name: 'Map: Movement & Auto-Center',
    scene: 'mapTest',
    description: 'Tests automated ship movement and auto-centering triggered by server state updates.',
    playerId: PLAYER_ROLES.CO,

    // Initial State: Start at (7, 7) - Middle of the map
    initialState: {
        version: 1,
        phase: 'LIVE',
        board: Array(15).fill(0).map(() => Array(15).fill(0)),
        submarines: [
            createMockSubmarineState({
                id: 'SUB_DEFAULT',
                co: PLAYER_ROLES.CO,
                xo: PLAYER_ROLES.XO,
                eng: PLAYER_ROLES.ENG,
                sonar: PLAYER_ROLES.SONAR,
                row: 7,
                col: 7
            })
        ]
    },

    timeline: [
        // Move North (Grid 6,7)
        {
            type: 'server_event',
            event: 'state',
            delay: 3000,
            data: {
                version: 2,
                phase: 'LIVE',
                board: Array(15).fill(0).map(() => Array(15).fill(0)),
                submarines: [
                    createMockSubmarineState({
                        id: 'SUB_DEFAULT',
                        co: PLAYER_ROLES.CO,
                        row: 6, col: 7
                    })
                ]
            }
        },
        // Move East (Grid 6,8)
        {
            type: 'server_event',
            event: 'state',
            delay: 3000,
            data: {
                version: 3,
                phase: 'LIVE',
                board: Array(15).fill(0).map(() => Array(15).fill(0)),
                submarines: [
                    createMockSubmarineState({
                        id: 'SUB_DEFAULT',
                        co: PLAYER_ROLES.CO,
                        row: 6, col: 8
                    })
                ]
            }
        },
        // Move South (Grid 7,8)
        {
            type: 'server_event',
            event: 'state',
            delay: 3000,
            data: {
                version: 4,
                phase: 'LIVE',
                board: Array(15).fill(0).map(() => Array(15).fill(0)),
                submarines: [
                    createMockSubmarineState({
                        id: 'SUB_DEFAULT',
                        co: PLAYER_ROLES.CO,
                        row: 7, col: 8
                    })
                ]
            }
        }
    ],

    run: (director) => {
        const log = (msg) => {
            window.dispatchEvent(new CustomEvent('director:ui_trigger', {
                detail: { action: 'LOG', message: msg }
            }));
        };

        log('🎬 Map Movement Scenario: Initializing...');

        // Subscribe to state changes to confirm the Director -> SocketManager path
        director.on('state', (state) => {
            const sub = state.submarines[0];
            log(`📡 DIRECTOR -> Emit 'state': Sub at (${sub.row}, ${sub.col})`);
        });
    }
};
