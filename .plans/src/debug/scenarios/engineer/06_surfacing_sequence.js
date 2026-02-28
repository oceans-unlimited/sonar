import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Surfacing Sequence',
  description: 'Captain surfaces, Engineer completes task, all damage clears',
  scene: 'engineer',
  
  timeline: [
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now(),
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SUBMERGED,
            health: 1,
            engineLayout: {
              crossedOutSlots: [
                { direction: 'N', slotId: 'slot01' },
                { direction: 'E', slotId: 'slot02' },
                { direction: 'S', slotId: 'reactor01' }
              ]
            }
          })
        }],
        ready: []
      }
    },
    { type: 'delay', ms: 1000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 1,
        phase: 'SURFACING',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SURFACING,
            submarineStateData: {
              SURFACING: {
                roleTaskCompletion: [
                  { role: 'co', completed: false },
                  { role: 'xo', completed: false },
                  { role: 'eng', completed: false },
                  { role: 'sonar', completed: false }
                ]
              }
            }
          })
        }],
        ready: []
      }
    },
    { type: 'delay', ms: 1000 },
    {
      type: 'ui_trigger',
      action: 'show_surfacing_task',
      target: 'eng'
    },
    { type: 'delay', ms: 2000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 2,
        phase: 'SURFACING',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SURFACING,
            submarineStateData: {
              SURFACING: {
                roleTaskCompletion: [
                  { role: 'co', completed: true },
                  { role: 'xo', completed: true },
                  { role: 'eng', completed: true },
                  { role: 'sonar', completed: false }
                ]
              }
            }
          })
        }],
        ready: []
      }
    },
    { type: 'delay', ms: 1000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 3,
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SURFACED,
            health: 4,
            engineLayout: {
              crossedOutSlots: []
            }
          })
        }],
        ready: []
      }
    }
  ]
};
