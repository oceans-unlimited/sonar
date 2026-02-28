import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Damage Resolution',
  description: 'Torpedo hits, Engineer sees damage resolution overlay',
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
        interruptType: 'TORPEDO_RESOLUTION',
        ready: [],
        submarines: [createMockSubmarineState({
          submarineState: SUBMARINE_STATES.SUBMERGED,
          health: 4
        })]
      }
    },
    { type: 'delay', ms: 2000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 2,
        phase: 'INTERRUPT',
        interruptType: 'TORPEDO_RESOLUTION',
        ready: ['player_co'],
        submarines: [createMockSubmarineState({
          submarineState: SUBMARINE_STATES.SUBMERGED,
          health: 3,
          engineLayout: {
            crossedOutSlots: [
              { direction: 'N', slotId: 'slot01' },
              { direction: 'E', slotId: 'reactor01' }
            ]
          }
        })]
      }
    },
    { type: 'ui_trigger', action: 'pulse_ready_button', delay: 500 },
    { type: 'delay', ms: 2000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 3,
        phase: 'LIVE',
        submarines: [createMockSubmarineState({
          submarineState: SUBMARINE_STATES.SUBMERGED,
          health: 3,
          engineLayout: {
            crossedOutSlots: [
              { direction: 'N', slotId: 'slot01' },
              { direction: 'E', slotId: 'reactor01' }
            ]
          }
        })],
        ready: []
      }
    }
  ]
};
