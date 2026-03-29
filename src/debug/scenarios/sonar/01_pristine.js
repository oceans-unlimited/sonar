/**
 * Sonar - Pristine Scenario
 * A layout-focused scenario for the Sonar (Acoustics) station.
 * Focuses on map rendering and layout configuration.
 */

import { simulationClock } from '../../../core/clock/simulationClock';
import { PLAYER_ROLES } from '../shared/engineMockData.js';

export default {
    name: "Sonar - Pristine",
    scene: 'sonar',
    playerId: PLAYER_ROLES.SONAR,
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
                submarineStateData: { }
            }
        ]
    },

    /**
     * Dynamic scenario logic
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));

        log('🚀 Sonar Pristine Layout Test Started');

        // Ensure clock is running so interaction isn't locked
        simulationClock.start();

        // Placeholder for future test logic involving drone/sonar ping tracking and audio signals
    },

    timeline: []
};
