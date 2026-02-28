import { createMockSubmarineState } from '../shared/engineMockData.js';

export default {
  name: 'Damage - Pristine',
  description: 'Baseline state for damage feedback testing.',
  scene: 'damageTest',
  
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
