import { createMockSubmarineState } from '../shared/engineMockData.js';

export default {
  name: 'Surface - Pristine',
  description: 'Baseline state for surfacing sequence testing.',
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
    }
  ]
};
