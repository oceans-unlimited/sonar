import { createMockSubmarineState, SUBMARINE_STATES, PLAYER_ROLES } from '../shared/engineMockData.js';

/**
 * Conn - Interactive Move Loop
 * Simulates the full movement cycle: Captain Move -> Engineer delay -> XO delay -> Submerge.
 * This scenario allows testing the helm UI and navigation state feedback.
 */
export default {
    name: 'Conn - Interactive Move Loop',
    description: 'Fully interactive loop: You move -> Engineer Crosses-off -> XO Charges -> Submerge -> Repeat.',
    playerId: PLAYER_ROLES.CO,
    scene: 'conn',

    // Initial State
    initialState: {
        version: Date.now(),
        phase: 'LIVE',
        board: Array(15).fill(0).map(() => Array(15).fill(0)), // Simple water board
        submarines: [createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: 7,
            col: 7,
            past_track: []
        })]
    },

    /**
     * Dynamic scenario logic
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        log('🚀 Conn Interactive Move Loop Started');
        
        // Local state for the sub
        let subData = {
            row: 7,
            col: 7,
            past_track: []
        };

        // The Game Loop
        while (director.isRunning) {
            // A. Wait for Captain Move
            log('🕹️ Awaiting helm order...');
            const direction = await new Promise((resolve) => {
                const handler = (dir) => {
                    director.off('move', handler);
                    resolve(dir);
                };
                director.on('move', handler);
            });

            log(`📢 HELM: Moving ${getDirName(direction)}...`);
            
            const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
            const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

            // B. Transition to MOVED (Engineer/XO Pending)
            log(`⚠️ STATE: MOVED. Waiting for Engineer...`);
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    row: subData.row, // Server logic: Position updates on MOVED state
                    col: subData.col,
                    past_track: [...subData.past_track],
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: false,
                            xoChargedGauge: false
                        }
                    }
                })]
            });

            await delay(2000);

            // C. Simulating Engineer Cross-off
            log(`🔧 ENGINEER: System disabled. Waiting for XO...`);
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: true,
                            xoChargedGauge: false
                        }
                    }
                })]
            });

            await delay(2000);

            // D. Simulating XO Charge
            log(`⚡ XO: Gauge charged. Ready to submerge.`);
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: true,
                            xoChargedGauge: true
                        }
                    }
                })]
            });

            await delay(1500);

            // E. Finalize Move (Submerge)
            subData.past_track.push({ row: subData.row, col: subData.col });
            subData.row += rowDeltas[direction];
            subData.col += colDeltas[direction];

            log(`🌊 Diving... Position updated to ${subData.row}, ${subData.col}`);
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track]
                })]
            });

            await delay(1500);
        }
    }
};

function getDirName(d) {
    return { 'N': 'North', 'E': 'East', 'S': 'South', 'W': 'West' }[d];
}
