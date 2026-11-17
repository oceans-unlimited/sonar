import { simulationClock } from '../../../core/clock/simulationClock';
import { createMockSubmarineState, SUBMARINE_STATES, PLAYER_ROLES } from '../shared/engineMockData.js';

const BOARD = Array(15).fill(0).map(() => Array(15).fill(0));

/**
 * Conn - Weapons Hot
 * Starts the sub fully charged, allowing torpedo launches and targeting to be tested.
 */
export default {
    name: 'Conn - Weapons Hot',
    description: 'All weapon subsystems charged. Ready to target and fire torpedoes.',
    playerId: PLAYER_ROLES.CO,
    scene: 'conn',

    // Initial State
    initialState: {
        version: Date.now(),
        phase: 'LIVE',
        board: BOARD,
        submarines: [createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: 7,
            col: 7,
            past_track: [],
            actionGauges: { mine: 3, torpedo: 3, drone: 3, sonar: 3, silence: 5 }
        })]
    },

    /**
     * Dynamic scenario logic
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        log('🚀 Conn Weapons Hot Started');

        simulationClock.start();

        let subData = {
            row: 7,
            col: 7,
            past_track: [],
            actionGauges: { mine: 3, torpedo: 3, drone: 3, sonar: 3, silence: 5 }
        };

        // Listen for launch_torpedo
        director.on('launch_torpedo', async ({ row, col }) => {
            log(`💥 TORPEDO LAUNCHED at (${row}, ${col})`);

            subData.actionGauges.torpedo = 0;

            // Trigger Interrupt
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'INTERRUPT',
                activeInterrupt: {
                    type: 'WEAPON_RESOLUTION',
                    data: {
                        weaponType: 'torpedo',
                        launchingSubId: 'A', // assuming A
                        row, col,
                        damagedSubs: [] // Simulate a miss
                    }
                },
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { ...subData.actionGauges }
                })]
            });

            await delay(3000);

            log('🔄 Resolving weapons, returning to LIVE');
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { ...subData.actionGauges }
                })]
            });
        });

        // Loop for movement
        while (director.isRunning) {
            const direction = await new Promise((resolve) => {
                const handler = (dir) => {
                    director.off('move', handler);
                    resolve(dir);
                };
                director.on('move', handler);
            });

            log(`📢 HELM: Moving ${direction}...`);
            
            const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
            const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

            subData.past_track.push({ row: subData.row, col: subData.col });
            subData.row += rowDeltas[direction];
            subData.col += colDeltas[direction];

            // Auto-complete move loop instantly
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: BOARD,
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    row: subData.row,
                    col: subData.col,
                    past_track: [...subData.past_track],
                    actionGauges: { ...subData.actionGauges }
                })]
            });
        }
    }
};
