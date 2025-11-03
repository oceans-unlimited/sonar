export const mockLayout = {
  sessionId: 'engine_1678886400000_abcdef123',
  directions: {
    N: {
      frameSlots: { 
        slot01: { system: 'stealth', pushed: false },
        slot02: { system: 'weapons', pushed: false },
        slot03: { system: 'detection', pushed: false }
      },
      reactorSlots: { 
        reactor01: { system: 'reactor', pushed: false },
        reactor02: { system: 'stealth', pushed: false },
        reactor03: { system: 'reactor', pushed: false }
      }
    },
    E: {
      frameSlots: { 
        slot01: { system: 'weapons', pushed: false },
        slot02: { system: 'detection', pushed: false },
        slot03: { system: 'stealth', pushed: false }
      },
      reactorSlots: { 
        reactor01: { system: 'reactor', pushed: false },
        reactor02: { system: 'weapons', pushed: false },
        reactor03: { system: 'detection', pushed: false }
      }
    },
    W: {
      frameSlots: { 
        slot01: { system: 'detection', pushed: false },
        slot02: { system: 'stealth', pushed: false },
        slot03: { system: 'weapons', pushed: false }
      },
      reactorSlots: { 
        reactor01: { system: 'reactor', pushed: false },
        reactor02: { system: 'detection', pushed: false },
        reactor03: { system: 'stealth', pushed: false }
      }
    },
    S: {
      frameSlots: { 
        slot01: { system: 'weapons', pushed: false },
        slot02: { system: 'detection', pushed: false },
        slot03: { system: 'stealth', pushed: false }
      },
      reactorSlots: { 
        reactor01: { system: 'reactor', pushed: false },
        reactor02: { system: 'reactor', pushed: false },
        reactor03: { system: 'weapons', pushed: false }
      }
    }
  },
  circuits: [
    {
      id: 'circuit_1',
      color: '#3498db',
      connections: [
        { direction: 'N', slotType: 'frame', slotId: 'slot01', system: 'stealth' },
        { direction: 'E', slotType: 'frame', slotId: 'slot01', system: 'weapons' },
        { direction: 'W', slotType: 'frame', slotId: 'slot01', system: 'detection' },
        { direction: 'S', slotType: 'frame', slotId: 'slot03', system: 'stealth' }
      ]
    },
    {
      id: 'circuit_2',
      color: '#2ecc71',
      connections: [
        { direction: 'N', slotType: 'frame', slotId: 'slot02', system: 'weapons' },
        { direction: 'E', slotType: 'frame', slotId: 'slot02', system: 'detection' },
        { direction: 'W', slotType: 'frame', slotId: 'slot02', system: 'stealth' },
        { direction: 'S', slotType: 'frame', slotId: 'slot01', system: 'weapons' }
      ]
    },
    {
      id: 'circuit_3',
      color: '#e74c3c',
      connections: [
        { direction: 'N', slotType: 'frame', slotId: 'slot03', system: 'detection' },
        { direction: 'E', slotType: 'frame', slotId: 'slot03', system: 'stealth' },
        { direction: 'W', slotType: 'frame', slotId: 'slot03', system: 'weapons' },
        { direction: 'S', slotType: 'frame', slotId: 'slot02', system: 'detection' }
      ]
    }
  ]
};