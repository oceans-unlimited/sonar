import { buildStateUpdate } from '../shared/engineEventBuilders.js';
import { MOCK_CROSSED_OUT_PATTERNS, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Direction Critical',
  description: 'North direction has 5/6 slots crossed, one more = breakdown',
  scene: 'engineer',
  
  timeline: [
    buildStateUpdate({
      submarineState: SUBMARINE_STATES.SUBMERGED,
      health: 2,
      engineLayout: {
        crossedOutSlots: MOCK_CROSSED_OUT_PATTERNS.DIRECTION_CRITICAL
      }
    })
  ]
};
