import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

/**
 * Engineer - Interaction Guard Test
 * 
 * Verifies the engineerCrossedOutSystem guard in EngineerController.
 * Starts in MOVED state with engineerCrossedOutSystem=true (engineer already done,
 * waiting on XO). All engine slots should be LOCKED despite being in MOVED state.
 */
export default {
  name: 'Engineer - Interaction Guard',
  description: 'MOVED state with engineerCrossedOutSystem=true. All slots should be locked (waiting on XO).',
  playerId: 'player_eng',
  scene: 'engineer',

  initialState: createMockSubmarineState({
    submarineState: SUBMARINE_STATES.MOVED,
    submarineStateData: {
      MOVED: {
        directionMoved: 'N',
        engineerCrossedOutSystem: true,
        xoChargedGauge: false
      }
    }
  }),

  run: async (director) => {
    const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    log('🔒 Interaction Guard Test: Engineer has completed task, awaiting XO.');
    log('⚠️ VERIFY: All engine slots should be LOCKED (non-interactive).');
    log('⚠️ VERIFY: No slot should respond to clicks.');
    await delay(3000);

    // Simulate XO completing their task — sub returns to SUBMERGED
    log('✅ XO charged gauge. Diving...');
    director.emit('state', {
      version: Date.now(),
      phase: 'LIVE',
      submarines: [createMockSubmarineState({
        submarineState: SUBMARINE_STATES.SUBMERGED
      })]
    });

    log('🌊 Submerged. Slots should remain locked (SUBMERGED state).');
  }
};
