/**
 * XO - Pristine Scenario
 * A clean state for the First Officer (XO) station.
 */

export default {
    name: "XO - Pristine",
    scene: 'xo',
    initialState: {
        submarines: [
            {
                id: 'player_sub',
                role: 'XO',
                systems: {
                    sonar: { level: 0, max: 4 },
                    drone: { level: 0, max: 3 },
                    mine: { level: 0, max: 3 },
                    torpedo: { level: 0, max: 3 },
                    silence: { level: 0, max: 6 },
                    scenario: { level: 0, max: 5 }
                }
            }
        ]
    },
    timeline: []
};
