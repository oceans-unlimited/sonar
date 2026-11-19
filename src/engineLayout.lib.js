class EngineLayoutGenerator {
  generateLayout() {
    const layout = {
      sessionId: this.generateSessionId(),
      directions: {
        W: {
          frameSlots: {slot01: 'weapons', slot02: 'vessel', slot03: 'detection'},
          reactorSlots: {reactor01: 'detection', reactor02: 'reactor', reactor03: 'reactor'}
        },
        N: {
          frameSlots: {slot01: 'vessel', slot02: 'weapons', slot03: 'vessel'},
          reactorSlots: {reactor01: 'detection', reactor02: 'weapons', reactor03: 'reactor'}
        },
        S: {
          frameSlots: {slot01: 'detection', slot02: 'vessel', slot03: 'weapons'},
          reactorSlots: {reactor01: 'weapons', reactor02: 'reactor', reactor03: 'vessel'}
        },
        E: {
          frameSlots: {slot01: 'detection', slot02: 'vessel', slot03: 'weapons'},
          reactorSlots: {reactor01: 'reactor', reactor02: 'detection', reactor03: 'reactor'}
        }
      },
      circuits: [
        {id: 'circuit_1', color: '#439cd8', connections: [
          {direction: 'W', slotType: 'frame', slotId: 'slot01', system: 'weapons'},
          {direction: 'W', slotType: 'frame', slotId: 'slot02', system: 'vessel'},
          {direction: 'W', slotType: 'frame', slotId: 'slot03', system: 'detection'},
          {direction: 'E', slotType: 'frame', slotId: 'slot03', system: 'weapons'},
        ]},
        {id: 'circuit_2', color: '#971ca5', connections: [
          {direction: 'N', slotType: 'frame', slotId: 'slot01', system: 'vessel'},
          {direction: 'N', slotType: 'frame', slotId: 'slot02', system: 'weapons'},
          {direction: 'N', slotType: 'frame', slotId: 'slot03', system: 'vessel'},
          {direction: 'E', slotType: 'frame', slotId: 'slot01', system: 'detection'},
        ]},
        {id: 'circuit_3', color: '#dd782b', connections: [
          {direction: 'S', slotType: 'frame', slotId: 'slot01', system: 'detection'},
          {direction: 'S', slotType: 'frame', slotId: 'slot02', system: 'vessel'},
          {direction: 'S', slotType: 'frame', slotId: 'slot03', system: 'weapons'},
          {direction: 'E', slotType: 'frame', slotId: 'slot02', system: 'vessel'},
        ]}
      ],
      crossedOutSlots: [], // {direction, slotId}
    };

    return layout;
  }

  generateSessionId() {
    return `engine_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export { EngineLayoutGenerator };
