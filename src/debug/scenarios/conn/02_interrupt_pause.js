import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
    name: 'Conn - Pause Interrupt',
    description: 'Captain pauses game, sees generic Pause overlay',
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
                activeInterrupt: { type: 'PAUSE' },
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
                    health: 4
                })],
                ready: []
            }
        }
    ]
};
