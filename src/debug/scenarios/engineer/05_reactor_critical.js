import { createMockSubmarineState, createMockEngineLayout, MOCK_CROSSED_OUT_PATTERNS, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Reactor Critical',
  description: 'All reactor slots except one crossed, next reactor cross = breakdown',
  playerId: 'player_eng',
  scene: 'engineer',

  initialState: createMockSubmarineState({
    submarineState: SUBMARINE_STATES.SUBMERGED,
    health: 4,
    engineLayout: createMockEngineLayout(MOCK_CROSSED_OUT_PATTERNS.REACTOR_CRITICAL)
  }),

  run: async (director) => {
    const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    log('🚀 Starting Reactor Meltdown Test...');
    await delay(1000);

    // 1. Captain Moves West
    const direction = 'W';
    const finalSlotId = 'reactor03';
    log(`📢 Captain Orders: "Helm, West!"`);
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
        engineLayout: createMockEngineLayout(MOCK_CROSSED_OUT_PATTERNS.REACTOR_CRITICAL)
      })]
    });

    log(`☢️ REACTOR CRITICAL! Crossing ${direction}:${finalSlotId} will cause reactor failure.`);

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

    log(`🚨 REACTOR OVERHEATED! 1 Damage taken.`);
    await delay(1000);

    // 3. Emit Damage State
    director.emit('state', {
      version: Date.now(),
      phase: 'LIVE',
      submarines: [createMockSubmarineState({
        submarineState: SUBMARINE_STATES.SUBMERGED,
        health: 3,
        engineLayout: createMockEngineLayout([])
      })]
    });

    log('🌊 Emergency shutdown complete. Board reset.');
  }
};

