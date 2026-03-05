import { PLAYER_ROLES, SUBMARINE_STATES } from '../shared/engineMockData.js';

/**
 * Scenario: Realtime Engine Logic Test
 * Verifies the "Data Normalizer" chain: 
 * Raw JSON -> SubmarineFeature -> SubmarineState (View Model) -> Scene UI
 */
export default {
    name: "Test: Realtime Engine Logic",
    scene: 'test',
    playerId: PLAYER_ROLES.CO,
    
    // 1. Initial State (Simulates Player Connecting to Sub A as Captain)
    initialState: {
        phase: 'LIVE',
        submarines: [
            {
                id: 'A',
                name: 'Vessel A',
                co: PLAYER_ROLES.CO,
                xo: 'player_xo',
                eng: 'player_eng',
                sonar: 'player_sonar',
                health: 4,
                submarineState: 'SUBMERGED',
                row: 7,
                col: 7,
                submarineStateData: {
                    MOVED: { directionMoved: ' ', engineerCrossedOutSystem: false, xoChargedGauge: false }
                }
            },
            {
                id: 'B',
                name: 'Enemy B',
                co: 'other_co',
                health: 4,
                submarineState: 'SUBMERGED',
                row: 2,
                col: 2
            }
        ]
    },

    timeline: [
        { type: 'ui_trigger', action: 'log', message: '🚀 Starting Fact-Normalization Test...' },
        { type: 'delay', ms: 1000 },

        // 2. Test Movement Fact
        { 
            type: 'server_event', 
            event: 'stateUpdate', 
            data: {
                submarines: [{ id: 'A', row: 6, col: 7, submarineState: 'MOVED' }]
            } 
        },
        { type: 'ui_trigger', action: 'log', message: '⚠️ Ownship moved to (6,7). Logic should LOCK movement.' },
        { type: 'delay', ms: 2000 },

        // 3. Test Multi-Role State Fact (Engineer Confirmation)
        { 
            type: 'server_event', 
            event: 'stateUpdate', 
            data: {
                submarines: [{ 
                    id: 'A', 
                    submarineStateData: { 
                        MOVED: { engineerCrossedOutSystem: true } 
                    } 
                }]
            } 
        },
        { type: 'ui_trigger', action: 'log', message: '✅ Engineer confirmed. Logic: Awaiting First Officer.' },
        { type: 'delay', ms: 2000 },

        // 4. Test Global Interrupt Fact (Pause)
        { 
            type: 'server_event', 
            event: 'stateUpdate', 
            data: {
                phase: 'INTERRUPT',
                activeInterrupt: { type: 'PAUSE', payload: { message: "Bathroom Break" } }
            } 
        },
        { type: 'ui_trigger', action: 'log', message: '⏸ Global PAUSE initiated.' },
        { type: 'delay', ms: 3000 },

        // 5. Test Recovery Fact (Return to Play)
        { 
            type: 'server_event', 
            event: 'stateUpdate', 
            data: {
                phase: 'LIVE',
                activeInterrupt: null,
                submarines: [{ id: 'A', submarineState: 'SUBMERGED' }]
            } 
        },
        { type: 'ui_trigger', action: 'log', message: '▶ Play resumed. Logic: SUBMERGED (Ready to move again).' },
        { type: 'delay', ms: 2000 },

        // 6. Test Damage Fact
        { 
            type: 'server_event', 
            event: 'stateUpdate', 
            data: {
                submarines: [{ id: 'A', health: 1 }]
            } 
        },
        { type: 'ui_trigger', action: 'log', message: '🔥 Hull integrity critical (1/4)!' },
    ]
};
