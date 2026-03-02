/**
 * Conn - Pristine Scenario
 * A layout-focused scenario for the Captain's (Conn) station.
 * Focuses on map rendering and helm interaction.
 */

import { simulationClock } from '../../../core/clock/simulationClock';
import { PLAYER_ROLES } from '../shared/engineMockData.js';

export default {
    name: "Conn - Pristine",
    scene: 'conn',
    playerId: PLAYER_ROLES.CO,
    initialState: {
        phase: 'LIVE',
        board: Array(15).fill(0).map(() => Array(15).fill(0)), // Simple 15x15 water board
        submarines: [
            {
                id: 'player_sub',
                co: PLAYER_ROLES.CO,
                xo: PLAYER_ROLES.XO,
                eng: PLAYER_ROLES.ENG,
                sonar: PLAYER_ROLES.SONAR,
                submarineState: 'SUBMERGED',
                row: 7,
                col: 7,
                pastTrack: [],
                submarineStateData: {
                    POST_MOVEMENT: {
                        directionMoved: ' '
                    }
                }
            }
        ]
    },

    /**
     * Dynamic scenario logic for movement testing.
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));

        log('🚀 Conn Pristine Layout Test Started');

        // Ensure clock is running so interaction isn't locked
        simulationClock.start();

        // Local state tracking
        let state = {
            row: 7,
            col: 7,
            pastTrack: []
        };

        // Listen for movement events from the controller/socket
        director.on('move', (direction) => {
            log(`🕹️ Received movement intent: ${direction}`);

            const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
            const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

            const newRow = state.row + rowDeltas[direction];
            const newCol = state.col + colDeltas[direction];

            // In this pristine scenario, we just blindly accept the move for testing visuals
            state.pastTrack.push({ row: state.row, col: state.col });
            state.row = newRow;
            state.col = newCol;

            log(`📍 New Position: ${state.row}, ${state.col}`);

            // Re-emit updated state to client
            director.injectEvent('state', {
                phase: 'LIVE',
                board: Array(15).fill(0).map(() => Array(15).fill(0)),
                submarines: [
                    {
                        id: 'player_sub',
                        co: PLAYER_ROLES.CO,
                        xo: PLAYER_ROLES.XO,
                        eng: PLAYER_ROLES.ENG,
                        sonar: PLAYER_ROLES.SONAR,
                        submarineState: 'SUBMERGED',
                        row: state.row,
                        col: state.col,
                        pastTrack: [...state.pastTrack],
                        submarineStateData: {
                            POST_MOVEMENT: {
                                directionMoved: direction
                            }
                        }
                    }
                ]
            });
        });
    },

    timeline: []
};
