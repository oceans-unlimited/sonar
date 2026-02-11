import { buildStateUpdate } from '../shared/engineEventBuilders.js';
import { SUBMARINE_STATES, MOCK_CROSSED_OUT_PATTERNS } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Pristine State',
  description: 'Full health, no damage, SUBMERGED state. This reflects the initial state broadcast when a game begins.',
  scene: 'engineer',
  
  timeline: [
    buildStateUpdate({
      submarineState: SUBMARINE_STATES.SUBMERGED,
      health: 4,
      engineLayout: {
        crossedOutSlots: MOCK_CROSSED_OUT_PATTERNS.PRISTINE
      }
    })
  ]
};
