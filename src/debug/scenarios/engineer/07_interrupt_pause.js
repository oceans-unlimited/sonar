import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Pause Interrupt',
  description: 'Captain pauses game, Engineer sees non-interactive overlay',
  scene: 'engineer',
  
  timeline: [
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now(),
        phase: 'LIVE',
        submarines: [createMockSubmarineState({
          submarineState: SUBMARINE_STATES.SUBMERGED,
          health: 3
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
        interruptType: 'PAUSE',
        ready: [],
        submarines: [createMockSubmarineState({
          submarineState: SUBMARINE_STATES.SUBMERGED,
          health: 3
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
