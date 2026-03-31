/**
 * Conn - Pristine Scenario
 * A layout-focused scenario for the Captain's (Conn) station.
 * Focuses on map rendering and helm interaction.
 */

import { simulationClock } from '../../../core/clock/simulationClock';
import { createMockSubmarineState, SUBMARINE_STATES, PLAYER_ROLES } from '../shared/engineMockData.js';

export default {
    name: "Conn - Pristine",
    scene: 'conn',
    playerId: PLAYER_ROLES.CO,
    initialState: {
        phase: 'LIVE',
        board: Array(15).fill(0).map(() => Array(15).fill(0)), // Simple 15x15 water board
        submarines: [
            createMockSubmarineState({
                id: 'player_sub',
                submarineState: SUBMARINE_STATES.SUBMERGED,
                row: 7,
                col: 7,
                past_track: []
            })
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
        let subData = {
            row: 7,
            col: 7,
            past_track: []
        };

        // Listen for movement events from the controller/socket
        director.on('move', (direction) => {
            log(`🕹️ Received movement intent: ${direction}`);

            const rowDeltas = { N: -1, S: 1, E: 0, W: 0 };
            const colDeltas = { N: 0, S: 0, E: 1, W: -1 };

            // Simulate immediate move for pristine testing
            subData.past_track.push({ row: subData.row, col: subData.col });
            subData.row += rowDeltas[direction];
            subData.col += colDeltas[direction];

            log(`📍 New Position: ${subData.row}, ${subData.col}`);

            // Re-emit updated state to client
            director.injectEvent('state', {
                version: Date.now(),
                phase: 'LIVE',
                board: Array(15).fill(0).map(() => Array(15).fill(0)),
                submarines: [
                    createMockSubmarineState({
                        id: 'player_sub',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
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
                    })
                ]
            });
        });
    },

    timeline: []
};
