import { buildStateUpdate } from '../shared/engineEventBuilders.js';
import { MOCK_CROSSED_OUT_PATTERNS, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Circuit Near Complete',
  description: 'Blue circuit has 3/4 slots crossed, one more triggers clear',
  scene: 'engineer',
  
  timeline: [
    buildStateUpdate({
      submarineState: SUBMARINE_STATES.SUBMERGED,
      health: 3,
      engineLayout: {
        crossedOutSlots: MOCK_CROSSED_OUT_PATTERNS.CIRCUIT_NEAR_COMPLETE
      }
    })
  ]
};
