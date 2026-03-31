import { simulationClock } from '../../../core/clock/simulationClock';
import { createMockSubmarineState, SUBMARINE_STATES, PLAYER_ROLES } from '../shared/engineMockData.js';

const BOARD = Array(15).fill(0).map(() => Array(15).fill(0));

/**
 * Conn - Start Positions
 * Two-step flow:
 *   1. Captain clicks a valid (water) grid square → ownship moves there (animate: false, center: true)
 *   2. Captain clicks Ready button → toggles ready state
 * Re-clicking the map resets ready to false and updates valid moves.
 * When all captains are ready, interrupt completes → transition to LIVE.
 */
export default {
    name: 'Conn - Start Positions',
    scene: 'conn',
    description: 'Captain selects starting position on map, then clicks Ready.',
    playerId: PLAYER_ROLES.CO,

    initialState: {
        version: Date.now(),
        phase: 'INTERRUPT',
        board: BOARD,
        activeInterrupt: {
            type: 'START_POSITIONS',
            payload: { message: 'Captains selecting starting positions' },
            data: { submarineIdsWithStartPositionChosen: [] }
        },
        submarines: [
            createMockSubmarineState({
                id: 'A',
                submarineState: SUBMARINE_STATES.SUBMERGED,
                row: 0,
                col: 0,
                co: PLAYER_ROLES.CO
            }),
            createMockSubmarineState({
                id: 'B',
                submarineState: SUBMARINE_STATES.SUBMERGED,
                row: 0,
                col: 0
            })
        ],
        ready: []
    },

    run: (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));

        simulationClock.start();

        log('🎯 START_POSITIONS: Click a water square to select, then click Ready.');

        // Track local state
        let selectedPos = null;
        let isReady = false;

        // Helper: build and emit a state snapshot
        const emitState = () => {
            const chosenIds = selectedPos ? ['A'] : [];
            const subA = createMockSubmarineState({
                id: 'A',
                submarineState: SUBMARINE_STATES.SUBMERGED,
                row: selectedPos ? selectedPos.row : 0,
                col: selectedPos ? selectedPos.col : 0,
                co: PLAYER_ROLES.CO
            });

            director.injectEvent('state', {
                version: Date.now(),
                phase: 'INTERRUPT',
                board: BOARD,
                activeInterrupt: {
                    type: 'START_POSITIONS',
                    payload: { message: 'Captains selecting starting positions' },
                    data: { submarineIdsWithStartPositionChosen: chosenIds }
                },
                submarines: [
                    subA,
                    createMockSubmarineState({
                        id: 'B',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
                        row: 14,
                        col: 14
                    })
                ],
                ready: isReady ? [PLAYER_ROLES.CO] : []
            });
        };

        // Listen for position selection from the captain clicking the map
        director.on('choose_initial_position', ({ row, column }) => {
            log(`📍 Captain selected position: (${row}, ${column})`);

            // Validate bounds
            if (row < 0 || row >= 15 || column < 0 || column >= 15) {
                log('❌ Invalid position: out of bounds');
                return;
            }

            // Validate terrain (all water in this scenario, but check anyway)
            if (BOARD[row][column] !== 0) {
                log('❌ Invalid position: LAND terrain');
                return;
            }

            // Update position and reset ready
            selectedPos = { row, col: column };
            isReady = false;

            log(`✅ Position set to (${row}, ${column}). Ready reset. Click Ready to confirm.`);
            emitState();
        });

        // Listen for ready toggle
        director.on('ready_interrupt', () => {
            if (!selectedPos) {
                log('⚠️ Cannot ready: no position selected yet!');
                return;
            }

            isReady = !isReady;
            log(`🏁 Ready toggled: ${isReady ? 'READY' : 'NOT READY'}`);
            emitState();

            // If ready, simulate checking if ALL captains are ready
            if (isReady) {
                log('⏳ Waiting for other captains... (simulating 3s delay)');
                setTimeout(() => {
                    if (!isReady) return; // They may have un-readied

                    log('✅ All captains ready! Transitioning to LIVE phase.');
                    director.injectEvent('state', {
                        version: Date.now(),
                        phase: 'LIVE',
                        board: BOARD,
                        activeInterrupt: null,
                        submarines: [
                            createMockSubmarineState({
                                id: 'A',
                                submarineState: SUBMARINE_STATES.SUBMERGED,
                                row: selectedPos.row,
                                col: selectedPos.col,
                                co: PLAYER_ROLES.CO,
                                past_track: []
                            }),
                            createMockSubmarineState({
                                id: 'B',
                                submarineState: SUBMARINE_STATES.SUBMERGED,
                                row: 14,
                                col: 14
                            })
                        ],
                        ready: []
                    });
                }, 3000);
            }
        });
    },

    timeline: [
        {
            type: 'ui_trigger',
            action: 'log',
            message: 'Click a water square on the map, then click Ready.'
        }
    ]
};
