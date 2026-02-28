export const SUBMARINE_STATES = {
  SUBMERGED: 'SUBMERGED',
  MOVED: 'MOVED',
  SURFACING: 'SURFACING',
  SURFACED: 'SURFACED',
  DESTROYED: 'DESTROYED'
};

export const MOCK_CROSSED_OUT_PATTERNS = {
  PRISTINE: [],
  LIGHT_DAMAGE: [
    { direction: 'N', slotId: 'slot01' }
  ],
  CIRCUIT_NEAR_COMPLETE: [
    { direction: 'N', slotId: 'slot01' },
    { direction: 'E', slotId: 'slot01' },
    { direction: 'S', slotId: 'slot02' }
    // Missing W/slot03 - circuit_1
  ],
  DIRECTION_CRITICAL: [
    { direction: 'N', slotId: 'slot01' },
    { direction: 'N', slotId: 'slot02' },
    { direction: 'N', slotId: 'slot03' },
    { direction: 'N', slotId: 'reactor01' },
    { direction: 'N', slotId: 'reactor02' }
    // Missing N/reactor03
  ],
  REACTOR_CRITICAL: [
    { direction: 'N', slotId: 'reactor01' },
    { direction: 'N', slotId: 'reactor02' },
    { direction: 'N', slotId: 'reactor03' },
    { direction: 'E', slotId: 'reactor01' },
    { direction: 'E', slotId: 'reactor02' },
    { direction: 'E', slotId: 'reactor03' },
    { direction: 'S', slotId: 'reactor01' },
    { direction: 'S', slotId: 'reactor02' },
    { direction: 'S', slotId: 'reactor03' },
    { direction: 'W', slotId: 'reactor01' },
    { direction: 'W', slotId: 'reactor02' }
    // Missing W/reactor03
  ]
};

export function createMockEngineLayout(crossedOutPattern = []) {
  return {
    sessionId: 'mock-session-' + Date.now(),
    directions: {
      N: {
        frameSlots: {
          slot01: 'vessel',
          slot02: 'weapons',
          slot03: 'detection'
        },
        reactorSlots: {
          reactor01: 'reactor',
          reactor02: 'reactor',
          reactor03: 'vessel'
        }
      },
      E: {
        frameSlots: {
          slot01: 'detection',
          slot02: 'weapons',
          slot03: 'vessel'
        },
        reactorSlots: {
          reactor01: 'reactor',
          reactor02: 'reactor',
          reactor03: 'detection'
        }
      },
      S: {
        frameSlots: {
          slot01: 'weapons',
          slot02: 'vessel',
          slot03: 'detection'
        },
        reactorSlots: {
          reactor01: 'reactor',
          reactor02: 'weapons',
          reactor03: 'vessel'
        }
      },
      W: {
        frameSlots: {
          slot01: 'vessel',
          slot02: 'detection',
          slot03: 'weapons'
        },
        reactorSlots: {
          reactor01: 'reactor',
          reactor02: 'detection',
          reactor03: 'weapons'
        }
      }
    },
    circuits: [
      {
        id: 'circuit_1',
        color: '#0088FF',
        connections: [
          { direction: 'N', slotType: 'frame', slotId: 'slot01', system: 'vessel' },
          { direction: 'E', slotType: 'frame', slotId: 'slot01', system: 'detection' },
          { direction: 'S', slotType: 'frame', slotId: 'slot02', system: 'vessel' },
          { direction: 'W', slotType: 'frame', slotId: 'slot03', system: 'weapons' }
        ]
      },
      {
        id: 'circuit_2',
        color: '#00FF88',
        connections: [
          { direction: 'N', slotType: 'frame', slotId: 'slot02', system: 'weapons' },
          { direction: 'E', slotType: 'frame', slotId: 'slot03', system: 'vessel' },
          { direction: 'S', slotType: 'frame', slotId: 'slot01', system: 'weapons' },
          { direction: 'W', slotType: 'frame', slotId: 'slot01', system: 'vessel' }
        ]
      },
      {
        id: 'circuit_3',
        color: '#FF0088',
        connections: [
          { direction: 'N', slotType: 'frame', slotId: 'slot03', system: 'detection' },
          { direction: 'E', slotType: 'frame', slotId: 'slot02', system: 'weapons' },
          { direction: 'S', slotType: 'frame', slotId: 'slot03', system: 'detection' },
          { direction: 'W', slotType: 'frame', slotId: 'slot02', system: 'detection' }
        ]
      }
    ],
    crossedOutSlots: [...crossedOutPattern]
  };
}

export function createMockSubmarineState(overrides = {}) {
  const defaultState = {
    submarineState: SUBMARINE_STATES.SUBMERGED,
    submarineStateData: {
      MOVED: {
        engineerCrossedOutSystem: false,
        xoChargedGauge: false,
        directionMoved: ''
      },
      SURFACING: {
        roleTaskCompletion: [
          { role: 'co', completed: false },
          { role: 'xo', completed: false },
          { role: 'eng', completed: false },
          { role: 'sonar', completed: false }
        ]
      }
    },
    health: 4,
    engineLayout: createMockEngineLayout(),
    co: 'player_co',
    xo: 'player_xo',
    eng: 'player_eng',
    sonar: 'player_sonar'
  };

  if (overrides.submarineStateData) {
    if (overrides.submarineStateData.MOVED) {
      defaultState.submarineStateData.MOVED = {
        ...defaultState.submarineStateData.MOVED,
        ...overrides.submarineStateData.MOVED
      };
    }
    if (overrides.submarineStateData.SURFACING) {
      defaultState.submarineStateData.SURFACING = {
        ...defaultState.submarineStateData.SURFACING,
        ...overrides.submarineStateData.SURFACING
      };
    }
    delete overrides.submarineStateData;
  }

  if (overrides.engineLayout) {
    defaultState.engineLayout = {
      ...defaultState.engineLayout,
      ...overrides.engineLayout
    };
    delete overrides.engineLayout;
  }

  return {
    ...defaultState,
    ...overrides
  };
}
