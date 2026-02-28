import { createMockSubmarineState } from '../shared/engineMockData.js';

export default {
  name: 'Submarine - Pristine',
  description: 'Standard baseline state for submarine testing.',
  scene: 'submarineTest',
  
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
