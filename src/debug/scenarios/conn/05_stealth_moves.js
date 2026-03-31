import { simulationClock } from '../../../core/clock/simulationClock';
import { createMockSubmarineState, SUBMARINE_STATES, PLAYER_ROLES } from '../shared/engineMockData.js';

const BOARD = Array(15).fill(0).map(() => Array(15).fill(0));

/**
 * Conn - Stealth Moves
 * Tests the silence (stealth) system: move up to 4 spaces in a straight line.
 * Silence gauge is pre-charged to 5 (fully charged).
 * Captain toggles Silent Running, then clicks a stealth-valid destination.
 */
export default {
    name: 'Conn - Stealth Moves',
    description: 'Silence system fully charged. Toggle Silent Running and navigate up to 4 spaces.',
    playerId: PLAYER_ROLES.CO,
    scene: 'conn',

    initialState: {
        version: Date.now(),
        phase: 'LIVE',
        board: BOARD,
        submarines: [createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: 7,
            col: 7,
            past_track: [],
            actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: 5 }
        })]
    },

    /**
     * Dynamic scenario logic
     * @param {import('../../Director').Director} director
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        log('🤫 Stealth Moves Scenario Started');
        log('   Silence gauge: FULLY CHARGED (5/5)');
        log('   Toggle "Silent Running" then click a destination up to 4 squares away.');

        simulationClock.start();

        // Local state for the sub
        let subData = {
            row: 7,
            col: 7,
            past_track: [],
            silenceGauge: 5
        };

        const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
        const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

        // The Game Loop — listens for silence events (stealth moves)
        while (director.isRunning) {
            log('🕹️ Awaiting stealth movement or standard helm order...');

            // Listen for either standard move or silence move
            const moveResult = await new Promise((resolve) => {
                const moveHandler = (dir) => {
                    director.off('move', moveHandler);
                    director.off('silence', silenceHandler);
                    resolve({ type: 'standard', direction: dir, spaces: 1 });
                };
                const silenceHandler = ({ direction, spaces }) => {
                    director.off('move', moveHandler);
                    director.off('silence', silenceHandler);
                    resolve({ type: 'stealth', direction, spaces });
                };
                director.on('move', moveHandler);
                director.on('silence', silenceHandler);
            });

            const { type, direction, spaces } = moveResult;

            if (type === 'stealth') {
                log(`🤫 SILENCE: Moving ${spaces} spaces ${getDirName(direction)} (stealth)`);

                // Consume silence gauge
                subData.silenceGauge = 0;
            } else {
                log(`📢 HELM: Moving ${getDirName(direction)} (standard)`);
            }

            // B. Transition to MOVED
            log(`⚠️ STATE: MOVED. Waiting for Engineer...`);
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: subData.silenceGauge },
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: false,
                            xoChargedGauge: false
                        }
                    }
                })]
            });

            await delay(1500);

            // C. Engineer cross-off
            log(`🔧 ENGINEER: System disabled.`);
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: subData.silenceGauge },
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: true,
                            xoChargedGauge: false
                        }
                    }
                })]
            });

            await delay(1500);

            // D. XO charge
            log(`⚡ XO: Gauge charged.`);
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: subData.silenceGauge },
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: true,
                            xoChargedGauge: true
                        }
                    }
                })]
            });

            await delay(1000);

            // E. Finalize Move (add all intermediate positions to past_track)
            for (let s = 0; s < spaces; s++) {
                subData.past_track.push({ row: subData.row, col: subData.col });
                subData.row += rowDeltas[direction];
                subData.col += colDeltas[direction];
            }

            log(`🌊 Diving... Position updated to (${subData.row}, ${subData.col})`);
            if (type === 'stealth') {
                log(`   Silence gauge consumed: 0/5`);
            }

            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: subData.silenceGauge }
                })]
            });

            await delay(1500);
        }
    }
};

function getDirName(d) {
    return { 'N': 'North', 'E': 'East', 'S': 'South', 'W': 'West' }[d];
}
