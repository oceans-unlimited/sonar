/**
 * XO - Pristine Scenario
 * A simplified button test for the First Officer (XO) station.
 * Focuses on charging subsystems and visual feedback.
 */

import { simulationClock } from '../../../core/clock/simulationClock';
import { PLAYER_ROLES } from '../shared/engineMockData.js';

export default {
    name: "XO - Pristine",
    scene: 'xo',
    playerId: PLAYER_ROLES.XO,
    initialState: {
        phase: 'LIVE',
        submarines: [
            {
                id: 'player_sub',
                co: PLAYER_ROLES.CO,
                xo: PLAYER_ROLES.XO,
                eng: PLAYER_ROLES.ENG,
                sonar: PLAYER_ROLES.SONAR,
                submarineState: 'POST_MOVEMENT',
                submarineStateData: {
                    POST_MOVEMENT: {
                        xoChargedGauge: false
                    }
                },
                actionGauges: {
                    sonar: 0,
                    drone: 0,
                    mine: 0,
                    torpedo: 0,
                    silence: 0,
                    scenario: 0
                }
            }
        ]
    },

    /**
     * Dynamic scenario logic for button testing.
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));

        log('🚀 XO Pristine Test Started');

        // Ensure clock is running so interaction isn't locked
        simulationClock.start();

        // Local state tracking (initially matching initialState)
        let gauges = {
            sonar: 0,
            drone: 0,
            mine: 0,
            torpedo: 0,
            silence: 0,
            scenario: 0
        };

        const maxLevels = {
            sonar: 3,
            drone: 3,
            mine: 3,
            torpedo: 3,
            silence: 5,
            scenario: 5
        };

        // Listen for charging events from the controller
        director.on('charge_gauge', (key) => {
            if (gauges[key] !== undefined && gauges[key] < maxLevels[key]) {
                gauges[key]++;
                log(`⚡ Charged ${key}: ${gauges[key]}/${maxLevels[key]}`);

                // Re-emit updated state to client
                director.injectEvent('state', {
                    phase: 'LIVE',
                    submarines: [
                        {
                            id: 'player_sub',
                            co: PLAYER_ROLES.CO,
                            xo: PLAYER_ROLES.XO,
                            submarineState: 'POST_MOVEMENT',
                            submarineStateData: {
                                POST_MOVEMENT: {
                                    xoChargedGauge: false
                                }
                            },
                            actionGauges: { ...gauges }
                        }
                    ]
                });

                if (gauges[key] >= maxLevels[key]) {
                    log(`✅ ${key.toUpperCase()} FULL`);
                }
            } else if (gauges[key] >= maxLevels[key]) {
                log(`⚠️ ${key} is already full!`);
            }
        });
    },

    timeline: []
};
