import { createMockSubmarineState, SUBMARINE_STATES, PLAYER_ROLES } from '../shared/engineMockData.js';

const BOARD = Array(15).fill(0).map(() => Array(15).fill(0));

/**
 * Sonar - Start Positions
 * Crew perspective: Sonar sees "AWAITING CAPTAINS" in their control panel swap area.
 * Timeline simulates the captains completing selection, then transition to LIVE.
 */
export default {
    name: 'Sonar - Start Positions',
    description: 'Sonar sees crew interrupt panel while captains select positions.',
    scene: 'sonar',
    playerId: PLAYER_ROLES.SONAR,

    timeline: [
        {
            type: 'server_event',
            event: 'state',
            data: {
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
                        sonar: PLAYER_ROLES.SONAR
                    }),
                    createMockSubmarineState({
                        id: 'B',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
                        row: 0,
                        col: 0,
                        co: 'p2_co',
                        xo: 'p2_xo',
                        eng: 'p2_eng',
                        sonar: 'p2_sonar'
                    })
                ],
                ready: []
            }
        },
        { type: 'delay', ms: 3000 },
        {
            type: 'ui_trigger',
            action: 'log',
            message: '📍 Captain A selected position (7, 3).'
        },
        {
            type: 'server_event',
            event: 'state',
            data: {
                version: Date.now() + 1,
                phase: 'INTERRUPT',
                board: BOARD,
                activeInterrupt: {
                    type: 'START_POSITIONS',
                    payload: { statusText: 'Sub A positioned.' },
                    data: { submarineIdsWithStartPositionChosen: ['A'] }
                },
                submarines: [
                    createMockSubmarineState({
                        id: 'A',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
                        row: 7,
                        col: 3,
                        sonar: PLAYER_ROLES.SONAR
                    }),
                    createMockSubmarineState({
                        id: 'B',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
                        row: 0,
                        col: 0,
                        co: 'p2_co',
                        xo: 'p2_xo',
                        eng: 'p2_eng',
                        sonar: 'p2_sonar'
                    })
                ],
                ready: []
            }
        },
        { type: 'delay', ms: 3000 },
        {
            type: 'ui_trigger',
            action: 'log',
            message: '✅ All captains ready. Transitioning to LIVE.'
        },
        {
            type: 'server_event',
            event: 'state',
            data: {
                version: Date.now() + 2,
                phase: 'LIVE',
                board: BOARD,
                activeInterrupt: null,
                submarines: [
                    createMockSubmarineState({
                        id: 'A',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
                        row: 7,
                        col: 3,
                        sonar: PLAYER_ROLES.SONAR,
                        past_track: []
                    }),
                    createMockSubmarineState({
                        id: 'B',
                        submarineState: SUBMARINE_STATES.SUBMERGED,
                        row: 14,
                        col: 14,
                        co: 'p2_co',
                        xo: 'p2_xo',
                        eng: 'p2_eng',
                        sonar: 'p2_sonar'
                    })
                ],
                ready: []
            }
        }
    ]
};
