export const mockLayout = {
  sessionId: 'engine_1678886400000_abcdef123',
  directions: {
    N: {
      frameSlots: { slot01: 'stealth', slot02: 'weapons', slot03: 'detection' },
      reactorSlots: { reactor01: 'reactor', reactor02: 'stealth', reactor03: 'reactor' }
    },
    E: {
      frameSlots: { slot01: 'weapons', slot02: 'detection', slot03: 'stealth' },
      reactorSlots: { reactor01: 'reactor', reactor02: 'weapons', reactor03: 'detection' }
    },
    W: {
      frameSlots: { slot01: 'detection', slot02: 'stealth', slot03: 'weapons' },
      reactorSlots: { reactor01: 'reactor', reactor02: 'detection', reactor03: 'stealth' }
    },
    S: {
      frameSlots: { slot01: 'weapons', slot02: 'detection', slot03: 'stealth' },
      reactorSlots: { reactor01: 'reactor', reactor02: 'reactor', reactor03: 'weapons' }
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