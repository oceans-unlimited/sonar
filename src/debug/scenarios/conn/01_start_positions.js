import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
  name: 'Conn - Start Positions',
  scene: 'conn',
  description: 'Game begins, Captain must select initial position on map.',
  playerId: 'player_co',

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
