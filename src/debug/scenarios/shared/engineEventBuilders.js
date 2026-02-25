import { createMockSubmarineState, createMockEngineLayout, SUBMARINE_STATES } from './engineMockData.js';

export function buildStateUpdate(submarineOverrides = {}) {
  const submarine = createMockSubmarineState(submarineOverrides);

  return {
    type: 'server_event',
    event: 'state',
    data: {
      version: Date.now(),
      phase: 'LIVE',
      submarines: [submarine],
      ready: [],
      players: [
        { id: 'player_co', name: 'Captain' },
        { id: 'player_xo', name: 'First Officer' },
        { id: 'player_eng', name: 'Engineer' },
        { id: 'player_sonar', name: 'Sonar Operator' }
      ]
    }
  };
}

export function buildMoveCycle(direction = 'N', options = {}) {
  const {
    initialHealth = 4,
    initialCrossedOut = [],
    slotToCross = 'slot01',
    xoCharges = true
  } = options;

  return [
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now(),
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.MOVED,
            submarineStateData: {
              MOVED: {
                directionMoved: direction,
                engineerCrossedOutSystem: false,
                xoChargedGauge: false
              }
            },
            health: initialHealth,
            engineLayout: createMockEngineLayout(initialCrossedOut)
          })
        }],
        ready: []
      }
    },
    { type: 'delay', ms: 500 },
    {
      type: 'ui_trigger',
      action: 'highlight_direction',
      target: direction
    },
    { type: 'delay', ms: 2000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 1,
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.MOVED,
            submarineStateData: {
              MOVED: {
                directionMoved: direction,
                engineerCrossedOutSystem: true,
                xoChargedGauge: xoCharges
              }
            },
            health: initialHealth,
            engineLayout: createMockEngineLayout([
              ...initialCrossedOut,
              { direction, slotId: slotToCross }
            ])
          })
        }],
        ready: []
      }
    },
    ...(xoCharges ? [
      { type: 'delay', ms: 500 },
      {
        type: 'server_event',
        event: 'state',
        data: {
          version: Date.now() + 2,
          phase: 'LIVE',
          submarines: [{
            ...createMockSubmarineState({
              submarineState: SUBMARINE_STATES.SUBMERGED,
              submarineStateData: {
                MOVED: {
                  directionMoved: ' ',
                  engineerCrossedOutSystem: false,
                  xoChargedGauge: false
                }
              },
              health: initialHealth,
              engineLayout: createMockEngineLayout([
                ...initialCrossedOut,
                { direction, slotId: slotToCross }
              ])
            })
          }],
          ready: []
        }
      }
    ] : [])
  ];
}

export function buildCircuitCompletion(circuitId = 'circuit_1', finalSlot, previousCrossedOut = []) {
  return [
    buildStateUpdate({
      submarineState: SUBMARINE_STATES.SUBMERGED,
      health: 3,
      engineLayout: {
        crossedOutSlots: previousCrossedOut
      }
    }),
    { type: 'delay', ms: 1000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now(),
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.MOVED,
            submarineStateData: {
              MOVED: {
                directionMoved: finalSlot.direction,
                engineerCrossedOutSystem: false,
                xoChargedGauge: false
              }
            },
            health: 3,
            engineLayout: createMockEngineLayout(previousCrossedOut)
          })
        }],
        ready: []
      }
    },
    { type: 'delay', ms: 1000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 1,
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.MOVED,
            submarineStateData: {
              MOVED: {
                directionMoved: finalSlot.direction,
                engineerCrossedOutSystem: true,
                xoChargedGauge: true
              }
            },
            health: 3,
            engineLayout: createMockEngineLayout([]) // Circuit completion clears slots in server
          })
        }],
        ready: []
      }
    },
    {
      type: 'ui_trigger',
      action: 'flash_circuit',
      target: circuitId,
      delay: 100
    }
  ];
}

export function buildBreakdownEvent(type = 'direction', direction = 'N', finalSlot, previousCrossedOut = [], currentHealth = 2) {
  return [
    buildStateUpdate({
      submarineState: SUBMARINE_STATES.SUBMERGED,
      health: currentHealth,
      engineLayout: {
        crossedOutSlots: previousCrossedOut
      }
    }),
    { type: 'delay', ms: 1000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now(),
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.MOVED,
            submarineStateData: {
              MOVED: {
                directionMoved: finalSlot.direction,
                engineerCrossedOutSystem: false,
                xoChargedGauge: false
              }
            },
            health: currentHealth,
            engineLayout: createMockEngineLayout(previousCrossedOut)
          })
        }],
        ready: []
      }
    },
    { type: 'delay', ms: 1000 },
    {
      type: 'server_event',
      event: 'state',
      data: {
        version: Date.now() + 1,
        phase: 'LIVE',
        submarines: [{
          ...createMockSubmarineState({
            submarineState: SUBMARINE_STATES.MOVED,
            submarineStateData: {
              MOVED: {
                directionMoved: finalSlot.direction,
                engineerCrossedOutSystem: true,
                xoChargedGauge: true
              }
            },
            health: Math.max(0, currentHealth - 1),
            engineLayout: createMockEngineLayout([]) // Direction/Reactor breakdown clears slots in server
          })
        }],
        ready: []
      }
    },
    {
      type: 'ui_trigger',
      action: 'breakdown_effect',
      target: type === 'direction' ? direction : 'reactor',
      delay: 100
    }
  ];
}
