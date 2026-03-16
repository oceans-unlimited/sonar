import { createMockSubmarineState, createMockEngineLayout, MOCK_CROSSED_OUT_PATTERNS, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Engineer - Circuit Near Complete',
  description: 'Blue circuit has 3/4 slots crossed, one more triggers clear',
  playerId: 'player_eng',
  scene: 'engineer',

  initialState: createMockSubmarineState({
    submarineState: SUBMARINE_STATES.SUBMERGED,
    health: 3,
    engineLayout: createMockEngineLayout(MOCK_CROSSED_OUT_PATTERNS.CIRCUIT_NEAR_COMPLETE)
  }),

  run: async (director) => {
    const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    log('🚀 Starting Circuit Completion Test...');
    await delay(1000);

    // 1. Captain Moves
    const direction = 'W';
    const finalSlotId = 'slot03';
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
        health: 3,
        engineLayout: createMockEngineLayout(MOCK_CROSSED_OUT_PATTERNS.CIRCUIT_NEAR_COMPLETE)
      })]
    });

    log(`⚠️ Waiting for Engineer to cross off ${direction}:${finalSlotId} to complete Blue Circuit.`);

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

    log(`✅ Circuit Complete! Server clearing slots...`);
    await delay(1000);

    // 3. Emit Clear State
    director.emit('state', {
      version: Date.now(),
      phase: 'LIVE',
      submarines: [createMockSubmarineState({
        submarineState: SUBMARINE_STATES.SUBMERGED,
        health: 3,
        engineLayout: createMockEngineLayout([]) // Clear all for simplicity in test
      })]
    });

    log('🌊 Dive complete. Board reset.');
  }
};

