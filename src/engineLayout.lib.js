class EngineLayoutGenerator {
  constructor() {
    this.systems = ['vessel', 'detection', 'weapons', 'reactor'];
    this.nonReactorSystems = ['vessel', 'detection', 'weapons'];
    this.directions = ['N', 'E', 'W', 'S'];
    this.frameSlots = ['slot01', 'slot02', 'slot03'];
    this.reactorSlots = ['reactor01', 'reactor02', 'reactor03'];
  }

  generateLayout() {
    const layout = {
      sessionId: this.generateSessionId(),
      directions: {},
      circuits: [],
      crossedOutSlots: [], // {direction, slotId}
    };

    // Initialize directions
    this.directions.forEach(dir => {
      layout.directions[dir] = { frameSlots: {}, reactorSlots: {} };
    });

    // Step 1: Distribute systems according to rules
    this.distributeSystems(layout);

    // Step 2: Generate circuits that follow the rules
    this.generateCircuits(layout);

    return layout;
  }

  distributeSystems(layout) {
    // Rule #1: Each direction gets exactly 1 of each system in frame slots
    // This is a contradiction as there are 4 systems and 3 slots.
    // I will assume that 3 of the 4 systems are randomly assigned to the frame slots.
    this.directions.forEach(dir => {
      const shuffledSystems = [...this.systems];
      this.shuffleArray(shuffledSystems);

      // Assign one of each system to frame slots
      this.frameSlots.forEach((slot, index) => {
        layout.directions[dir].frameSlots[slot] = shuffledSystems[index];
      });
    });

    // Rule #2: Fill reactor slots
    this.directions.forEach(dir => {
      const reactorAssignment = this.assignReactorSlots(layout.directions[dir]);
      layout.directions[dir].reactorSlots = reactorAssignment;
    });
  }

  assignReactorSlots(directionLayout) {
    const reactorAssignment = {};
    const usedNonReactor = new Set();

    // Count current systems in this direction
    const systemCounts = this.countSystemsInDirection(directionLayout);

    // Fill reactor slots
    this.reactorSlots.forEach(slot => {
      const availableSystems = [];

      // Always include reactor
      availableSystems.push('reactor');

      // Include non-reactor systems that:
      // - Haven't been used in reactor slots yet (Rule #2)
      // - Don't exceed max of 2 per system (Rule #1)
      this.nonReactorSystems.forEach(system => {
        if (!usedNonReactor.has(system) && systemCounts[system] < 2) {
          availableSystems.push(system);
        }
      });

      // Randomly choose from available systems
      const chosenSystem = availableSystems[Math.floor(Math.random() * availableSystems.length)];
      reactorAssignment[slot] = chosenSystem;

      // Track usage
      if (chosenSystem !== 'reactor') {
        usedNonReactor.add(chosenSystem);
      }
      systemCounts[chosenSystem]++;
    });

    return reactorAssignment;
  }

  countSystemsInDirection(directionLayout) {
    const counts = { vessel: 0, detection: 0, weapons: 0, reactor: 0 };

    // Count frame slots
    Object.values(directionLayout.frameSlots).forEach(system => {
      counts[system]++;
    });

    return counts;
  }

  generateCircuits(layout) {
    const circuitColors = ['#3498db', '#2ecc71', '#e74c3c'];
    const allFrameSlots = [];

    // Collect all frame slots with their systems
    this.directions.forEach(dir => {
      this.frameSlots.forEach(slot => {
        allFrameSlots.push({
          direction: dir,
          slotId: slot,
          system: layout.directions[dir].frameSlots[slot]
        });
      });
    });

    // Create circuits that satisfy Rule #3
    const circuits = [];
    const usedSlots = new Set();

    for (let i = 0; i < 3; i++) {
      const circuit = {
        id: `circuit_${i + 1}`,
        color: circuitColors[i],
        connections: []
      };

      // Required systems for this circuit
      const requiredSystems = [...this.nonReactorSystems];
      this.shuffleArray(requiredSystems);

      // Add one of each required system
      requiredSystems.forEach(requiredSystem => {
        const availableSlots = allFrameSlots.filter(slot =>
          !usedSlots.has(`${slot.direction}-${slot.slotId}`) &&
          slot.system === requiredSystem
        );

        if (availableSlots.length > 0) {
          const chosenSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
          circuit.connections.push({
            direction: chosenSlot.direction,
            slotType: 'frame',
            slotId: chosenSlot.slotId,
            system: chosenSlot.system
          });
          usedSlots.add(`${chosenSlot.direction}-${chosenSlot.slotId}`);
        }
      });

      // Fill remaining slot with any available system
      const remainingSlots = allFrameSlots.filter(slot =>
        !usedSlots.has(`${slot.direction}-${slot.slotId}`) && slot.system !== 'reactor'
      );

      if (remainingSlots.length > 0 && circuit.connections.length < 4) {
        const chosenSlot = remainingSlots[Math.floor(Math.random() * remainingSlots.length)];
        circuit.connections.push({
          direction: chosenSlot.direction,
          slotType: 'frame',
          slotId: chosenSlot.slotId,
          system: chosenSlot.system
        });
        usedSlots.add(`${chosenSlot.direction}-${chosenSlot.slotId}`);
      }

      circuits.push(circuit);
    }

    layout.circuits = circuits;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  generateSessionId() {
    return `engine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { EngineLayoutGenerator };
