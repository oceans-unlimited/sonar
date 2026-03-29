import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Conn - Start Positions',
  scene: 'conn',
  description: 'Game begins, Captain must select initial position on map.',
  playerId: 'player_co',

  run: (director) => {
    const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));

    log('🎯 START_POSITIONS scenario: Listening for position selection...');

    // Listen for the client's choose_initial_position emission
    director.on('choose_initial_position', ({ row, column }) => {
      log(`📍 Captain selected position: (${row}, ${column})`);

      // Simulate server validation (water check)
      if (row < 0 || row >= 15 || column < 0 || column >= 15) {
        log('❌ Invalid position: out of bounds');
        return;
      }

      // Update submarine position
      const updatedState = {
        version: Date.now(),
        phase: 'LIVE', // Since only one captain (sub A), transition immediately
        activeInterrupt: null,
        submarines: [
          createMockSubmarineState({
            id: 'A',
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: row,
            col: column,
            co: 'player_co'
          }),
          createMockSubmarineState({
            id: 'B',
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: 0,
            col: 0
          })
        ],
        board: Array(15).fill(0).map(() => Array(15).fill(0)), // All water
        ready: []
      };

      // Emit updated state to client
      director.injectEvent('state', updatedState);
      log('✅ Transitioned to LIVE phase');
    });
  },

  timeline: [
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now(),
        phase: 'INTERRUPT',
        activeInterrupt: {
          type: 'START_POSITIONS',
          payload: { message: "Captains selecting starting positions" },
          data: { submarineIdsWithStartPositionChosen: [] }
        },
        submarines: [
          createMockSubmarineState({
            id: 'A',
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: 0,
            col: 0,
            co: 'player_co' // Assume we are the captain
          }),
          createMockSubmarineState({
            id: 'B',
            submarineState: SUBMARINE_STATES.SUBMERGED,
            row: 0,
            col: 0
          })
        ],
        board: Array(15).fill(0).map(() => Array(15).fill(0)), // All water
        ready: []
      }
    },
    {
      type: 'ui_trigger',
      action: 'log',
      message: 'Waiting for Captain to click map...'
    }
  ]
};
