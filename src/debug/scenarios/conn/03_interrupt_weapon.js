import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
    name: 'Conn - Weapon Impact',
    description: 'Weapon hits, Captain sees damage resolution overlay',
    scene: 'conn',

    timeline: [
        {
            type: 'server_event',
            event: 'state',
            data: {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    health: 4
                })],
                ready: []
            }
        },
        { type: 'delay', ms: 2000 },
        {
            type: 'server_event',
            event: 'state',
            data: {
                version: Date.now() + 1,
                phase: 'INTERRUPT',
                activeInterrupt: { type: 'WEAPON_RESOLUTION' },
                ready: [],
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    health: 4
                })]
            }
        },
        { type: 'delay', ms: 3000 },
        {
            type: 'server_event',
            event: 'state',
            data: {
                version: Date.now() + 2,
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    health: 3
                })],
                ready: []
            }
        }
    ]
};
