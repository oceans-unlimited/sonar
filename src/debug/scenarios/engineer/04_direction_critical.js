import { createMockSubmarineState, createMockEngineLayout, MOCK_CROSSED_OUT_PATTERNS, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Direction Critical',
  description: 'North direction has 5/6 slots crossed, one more = breakdown',
  playerId: 'player_eng',
  scene: 'engineer',

  initialState: createMockSubmarineState({
    submarineState: SUBMARINE_STATES.SUBMERGED,
    health: 4, // Start at full health to see the transition
    engineLayout: createMockEngineLayout(MOCK_CROSSED_OUT_PATTERNS.DIRECTION_CRITICAL)
  }),

  run: async (director) => {
    const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    log('🚀 Starting Direction Breakdown Test...');
    await delay(1000);

    // 1. Captain Moves North
    const direction = 'N';
    const finalSlotId = 'reactor03';
    log(`📢 Captain Orders: "Helm, North!"`);
    await delay(1000);

    director.emit('state', {
      version: Date.now(),
      phase: 'LIVE',
      submarines: [createMockSubmarineState({
        submarineState: SUBMARINE_STATES.MOVED,
        submarineStateData: {
          MOVED: {
            directionMoved: direction,
            engineerCrossedOutSystem: false,
            xoChargedGauge: false
          }
        },
        health: 4,
        engineLayout: createMockEngineLayout(MOCK_CROSSED_OUT_PATTERNS.DIRECTION_CRITICAL)
      })]
    });

    log(`⚠️ WARNING: North direction is critical. Crossing ${direction}:${finalSlotId} will cause damage.`);

    // 2. Wait for User
    const userAction = await new Promise((resolve) => {
      const handler = (data) => {
        if (data.direction === direction && data.slotId === finalSlotId) {
          director.off('cross_off_system', handler);
          resolve(data);
        }
      };
      director.on('cross_off_system', handler);
    });

    log(`💥 CRITICAL BREAKDOWN! 1 Damage taken.`);
    await delay(1000);

    // 3. Emit Damage State
    director.emit('state', {
      version: Date.now(),
      phase: 'LIVE',
      submarines: [createMockSubmarineState({
        submarineState: SUBMARINE_STATES.SUBMERGED,
        health: 3,
        engineLayout: createMockEngineLayout([]) // Board resets on damage
      })]
    });

    log('🌊 Auto-diving after emergency repair. Board reset.');
  }
};

