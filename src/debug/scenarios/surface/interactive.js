import { createMockSubmarineState } from '../shared/engineMockData.js';

export default {
  name: 'Surface - Interactive Trace',
  description: 'Raster-based sequence tracing behavior with checkpoint saving and breach rules.',
  scene: 'surfaceTest',
  
  timeline: [
    {
      type: 'server_event',
      event: 'GAME_STATE',
      data: {
        version: 1,
        phase: 'LIVE',
        submarines: [
          createMockSubmarineState({
            submarineState: 'SUBMERGED',
            health: 4
          })
        ],
        ready: []
      }
    },
    {
      type: 'client_action',
      action: 'ENABLE_INTERACTIVE',
      delay: 500
    }
  ]
};
