import { buildStateUpdate } from '../shared/engineEventBuilders.js';
import { MOCK_CROSSED_OUT_PATTERNS, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Reactor Critical',
  description: 'All reactor slots except one crossed, next reactor cross = breakdown',
  scene: 'engineer',
  
  timeline: [
    buildStateUpdate({
      submarineState: SUBMARINE_STATES.SUBMERGED,
      health: 2,
      engineLayout: {
        crossedOutSlots: MOCK_CROSSED_OUT_PATTERNS.REACTOR_CRITICAL
      }
    })
  ]
};
