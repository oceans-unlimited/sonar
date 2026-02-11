## Status Summary: COMPLETED
Director Mode is fully implemented and integrated into the application lifecycle.

### Activation Pathway
Activation is controlled via the `?mode=test` URL parameter. When detected in `main.jsx`, the standard Socket.io connection is bypassed in favor of a local `Director` instance.

---

## Final Architecture
### Phase 1: Core Director Infrastructure [COMPLETED]
### Phase 2: Debug Overlay UI [COMPLETED]
### Phase 3: Integration with Main Application [COMPLETED]
### Phase 4: Example Scenarios [COMPLETED]

#### [NEW] [Director.js](file:///home/seth/Documents/Coding/laboratory/src/debug/Director.js)

**Purpose:** Mock Socket.io server that runs entirely client-side.

**API:**
```javascript
class Director {
  constructor()
  
  // Socket.io interface
  on(event, callback)
  emit(event, data)
  off(event, callback)
  
  // Director-specific API
  loadScenario(scenarioDef)
  triggerEvent(event, data, delay = 0)
  getState()
  reset()
}
```

**Key Features:**
**Key Features:**
- Maintains event listener registry
- Logs all emitted events to console for debugging
- Supports delayed event emission for timeline sequences
- **Dynamic Execution**: Supports `run(director)` for interactive, looped, or logic-driven scenarios.
- Can inject mock features into SceneManager

**Implementation Details:**
```javascript
export class Director {
  constructor() {
    this.listeners = {};
    this.currentScenario = null;
    this.eventQueue = [];
    this.isRunning = false;
  }
  
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  emit(event, data) {
    console.log(`[Director] EMIT: ${event}`, data);
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(data));
  }
  
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
  
  async loadScenario(scenarioDef) {
    console.log(`[Director] Loading scenario: ${scenarioDef.name}`);
    this.currentScenario = scenarioDef;
    
    // Execute timeline if present
    if (scenarioDef.timeline) {
      await this.executeTimeline(scenarioDef.timeline);
    }
  }
  
  async executeTimeline(timeline) {
    for (const step of timeline) {
      if (step.type === 'server_event') {
        this.emit(step.event, step.data);
      } else if (step.type === 'delay') {
        await new Promise(resolve => setTimeout(resolve, step.ms));
      } else if (step.type === 'ui_trigger') {
        // Emit custom event for overlay to handle
        window.dispatchEvent(new CustomEvent('director:ui_trigger', { 
          detail: step 
        }));
      }
      
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
    }
  }
  
  triggerEvent(event, data, delay = 0) {
    if (delay > 0) {
      setTimeout(() => this.emit(event, data), delay);
    } else {
      this.emit(event, data);
    }
  }
  
  reset() {
    this.listeners = {};
    this.currentScenario = null;
    this.eventQueue = [];
  }
}
```

---

#### [NEW] [scenarios/](file:///home/seth/Documents/Coding/laboratory/src/debug/scenarios/)

**Purpose:** Scenario definition files organized by feature/scene.

**Structure:**
```
src/debug/scenarios/
├── index.js              // Registry of all scenarios
├── engineer/
│   ├── basic.js          // Normal operation
│   ├── critical.js       // Low health, damage alerts
│   └── powerLoss.js      // Reactor failure sequence
├── captain/
│   ├── navigation.js     // Map navigation tests
│   └── combat.js         // Combat scenarios
└── shared/
    └── mockStates.js     // Reusable state fragments
```

**Scenario Format:**
```javascript
// scenarios/engineer/critical.js
export default {
  name: 'Engineer - Critical Damage',
  description: 'Engineer station with 10% health and active damage alerts',
  
  // Scene to load
  scene: 'engineer',  // Maps to SCENE_MAP key
  
  // Initial game state
  initialState: {
//...

```

---

#### [NEW] [scenarios/index.js](file:///home/seth/Documents/Coding/laboratory/src/debug/scenarios/index.js)

**Purpose:** Central registry of all available scenarios.

```javascript
import engineerBasic from './engineer/basic.js';
import engineerCritical from './engineer/critical.js';
import engineerPowerLoss from './engineer/powerLoss.js';

export const SCENARIO_REGISTRY = {
  'engineer_basic': engineerBasic,
  'engineer_critical': engineerCritical,
  'engineer_power_loss': engineerPowerLoss
};

export const SCENARIO_CATEGORIES = {
  'Engineer': ['engineer_basic', 'engineer_critical', 'engineer_power_loss'],
  'Captain': [],
  'Shared': []
};
```

---

### Phase 2: Debug Overlay UI

#### [NEW] [DebugOverlay.js](file:///home/seth/Documents/Coding/laboratory/src/debug/DebugOverlay.js)

**Purpose:** HTML overlay for scenario selection and live testing controls.

**Features:**
- **Collapsible panel** with toggle button in upper right corner
- Dropdown scenario selector
- "Load Scenario" button
- Current scenario display
- Event log viewer
- Manual event trigger controls

**Implementation:**
```javascript
export class DebugOverlay {
  constructor(director, sceneManager) {
    this.director = director;
    this.sceneManager = sceneManager;
    this.panel = null;
    this.toggleButton = null;
    this.isCollapsed = false;
  }
  
  mount() {
    // Create toggle button
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'debug-toggle';
    this.toggleButton.innerHTML = '🎬';
    this.toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      border: 2px solid #00ff00;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 20px;
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.toggleButton.addEventListener('mouseenter', () => {
      this.toggleButton.style.background = 'rgba(0, 50, 0, 0.9)';
      this.toggleButton.style.transform = 'scale(1.1)';
    });
    this.toggleButton.addEventListener('mouseleave', () => {
      this.toggleButton.style.background = 'rgba(0, 0, 0, 0.9)';
      this.toggleButton.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(this.toggleButton);
    
    // Create main panel
    this.panel = document.createElement('div');
    this.panel.id = 'debug-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      padding: 15px;
      border: 2px solid #00ff00;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 9999;
      min-width: 300px;
      max-height: 80vh;
      overflow-y: auto;
      transition: all 0.3s ease;
    `;
    
    this.render();
    document.body.appendChild(this.panel);
    
    // Listen for UI triggers from Director
    window.addEventListener('director:ui_trigger', (e) => {
      this.handleUITrigger(e.detail);
    });
  }
  
  toggle() {
    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateX(20px)';
      this.panel.style.pointerEvents = 'none';
      this.toggleButton.innerHTML = '🎬';
    } else {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateX(0)';
      this.panel.style.pointerEvents = 'auto';
      this.toggleButton.innerHTML = '✕';
    }
  }
  
  render() {
    this.panel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #00ff00;">🎬 DIRECTOR MODE</h3>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Select Scenario:</label>
        <select id="scenario-select" style="width: 100%; padding: 5px; background: #000; color: #00ff00; border: 1px solid #00ff00;">
          <option value="">-- Choose Scenario --</option>
          ${this.renderScenarioOptions()}
        </select>
      </div>
      
      <button id="load-scenario-btn" style="width: 100%; padding: 8px; background: #003300; color: #00ff00; border: 1px solid #00ff00; cursor: pointer; margin-bottom: 15px;">
        Load Scenario
      </button>
      
      <div id="current-scenario" style="margin-bottom: 15px; padding: 10px; background: #001100; border: 1px solid #003300; border-radius: 4px;">
        <strong>Current:</strong> <span id="scenario-name">None</span>
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Event Log:</strong>
        <div id="event-log" style="max-height: 200px; overflow-y: auto; background: #000; padding: 5px; border: 1px solid #003300; font-size: 10px; margin-top: 5px;">
          <div style="color: #666;">Waiting for events...</div>
        </div>
      </div>
      
      <button id="clear-log-btn" style="width: 100%; padding: 5px; background: #330000; color: #ff6666; border: 1px solid #660000; cursor: pointer;">
        Clear Log
      </button>
    `;
    
    this.attachEventListeners();
  }
  
  renderScenarioOptions() {
    let html = '';
    for (const [category, scenarios] of Object.entries(SCENARIO_CATEGORIES)) {
      html += `<optgroup label="${category}">`;
      for (const scenarioKey of scenarios) {
        const scenario = SCENARIO_REGISTRY[scenarioKey];
        html += `<option value="${scenarioKey}">${scenario.name}</option>`;
      }
      html += `</optgroup>`;
    }
    return html;
  }
  
  attachEventListeners() {
    document.getElementById('load-scenario-btn').addEventListener('click', () => {
      const select = document.getElementById('scenario-select');
      const scenarioKey = select.value;
      if (scenarioKey) {
        this.loadScenario(scenarioKey);
      }
    });
    
    document.getElementById('clear-log-btn').addEventListener('click', () => {
      document.getElementById('event-log').innerHTML = '<div style="color: #666;">Log cleared</div>';
    });
  }
  
  async loadScenario(scenarioKey) {
    const scenario = SCENARIO_REGISTRY[scenarioKey];
    if (!scenario) return;
    
    this.logEvent(`Loading: ${scenario.name}`);
    
    // Update UI
    document.getElementById('scenario-name').textContent = scenario.name;
    
    // Load scene module
    if (scenario.scene) {
      await this.sceneManager.loadScene(scenario.scene);
    }
    
    // Load scenario into Director
    await this.director.loadScenario(scenario);
    
    this.logEvent(`✓ Scenario loaded successfully`);
  }
  
  logEvent(message) {
    const log = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.style.cssText = 'margin-bottom: 3px; color: #00ff00;';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.insertBefore(entry, log.firstChild);
  }
  
  handleUITrigger(trigger) {
    this.logEvent(`UI Trigger: ${trigger.action} on ${trigger.target}`);
    // Implement UI trigger logic (e.g., highlight button, simulate click)
  }
  
  destroy() {
    if (this.panel) {
      this.panel.remove();
    }
    if (this.toggleButton) {
      this.toggleButton.remove();
    }
  }
}
```

---

### Phase 3: Integration with Main Application

#### [MODIFY] [main.jsx](file:///home/seth/Documents/Coding/laboratory/src/main.jsx)

**Changes:**
1. Check for `?mode=test` URL parameter
2. Conditionally create Director instead of real socket
3. Mount DebugOverlay if in test mode

```javascript
// ... imports ...

// Director Mode imports (conditional)
const isTestMode = window.location.search.includes('mode=test');
// ...

(async () => {
  // ... app initialization ...

  const sceneManager = new SceneManager(app);
  
  if (isTestMode) {
    console.log('🎬 DIRECTOR MODE ACTIVATED');
    
    // Create Director (mock socket)
    const director = new Director();
    app.socket = director;  
    
    // Inject Director into the SocketManager service
    // This allows SocketManager to proxy events and normalize data (e.g. stateUpdate)
    socketManager.bindSocket(app.director);
    
    // Initialize scene manager
    // SceneManager will inject socketManager into the Controllers
    await sceneManager.init();
    
    // Mount debug overlay
    const overlay = new DebugOverlay(director, sceneManager);
    overlay.mount();
    
    // Expose for debugging
    globalThis.__DIRECTOR__ = director;
    globalThis.__DEBUG_OVERLAY__ = overlay;
  } else {
    // Production mode - would connect to real socket.io server
    // socketManager.bindSocket(io());
    await sceneManager.init();
  }
})();
```

---

#### [MODIFY] [sceneManager.js](file:///home/seth/Documents/Coding/laboratory/src/core/sceneManager.js)

**Changes:**
1. Export a `SCENE_MAP` for use by the DebugOverlay and Director.
2. In `loadScene`, inject the `socketManager` singleton into the controller via `bindSocket(socketManager)`.

```javascript
// ... existing imports ...
import { socketManager } from './socketManager.js';

// ... maps ...

export class SceneManager {
    // ...
    async loadScene(sceneKey) {
        // ...
        this.currentController = new ControllerClass();

        // DEPENDENCY INJECTION:
        // Pass the socketManager service to the controller.
        // The controller uses this to listen for 'stateUpdate', 'disconnect', etc.
        this.currentController.bindSocket(socketManager);
        
        // ...
    }
}
```

---

### Phase 4: Example Scenarios

#### [NEW] [scenarios/engineer/basic.js](file:///home/seth/Documents/Coding/laboratory/src/debug/scenarios/engineer/basic.js)

```javascript
export default {
  name: 'Engineer - Normal Operation',
  description: 'Engineer station in normal operating conditions',
  scene: 'engineer',
  
  initialState: {
    health: 1.0,
    reactorLevel: 0.8,
    isPaused: false
  },
  
  timeline: [
    {
      type: 'server_event',
      event: 'GAME_STATE', // Server sends GAME_STATE
      data: { health: 1.0, reactorLevel: 0.8 }
      // SocketManager receives GAME_STATE and emits 'stateUpdate' to Controller
    }
  ]
};
```

---

#### [NEW] [scenarios/engineer/critical.js](file:///home/seth/Documents/Coding/laboratory/src/debug/scenarios/engineer/critical.js)

```javascript
export default {
  name: 'Engineer - Critical Damage',
  description: 'Low health with incoming damage events',
  scene: 'engineer',
  
  initialState: {
    health: 0.1,
    reactorLevel: 0.3,
    isPaused: false
  },
  
  timeline: [
    {
      type: 'server_event',
      event: 'GAME_STATE',
      data: { health: 0.1, reactorLevel: 0.3 },
      delay: 0
    },
    {
      type: 'delay',
      ms: 1000
    },
    {
      type: 'server_event',
      event: 'ENGINE_DAMAGE',
      data: { reactorId: 'reactor_01', severity: 'critical' },
      delay: 0
    },
    {
      type: 'delay',
      ms: 2000
    },
    {
      type: 'server_event',
      event: 'ENGINE_DAMAGE',
      data: { reactorId: 'reactor_02', severity: 'moderate' },
      delay: 0
    }
  ]
};
```

---

#### [NEW] [scenarios/engineer/powerLoss.js](file:///home/seth/Documents/Coding/laboratory/src/debug/scenarios/engineer/powerLoss.js)

```javascript
export default {
  name: 'Engineer - Reactor Failure Sequence',
  description: 'Simulates cascading reactor failures',
  scene: 'engineer',
  
  initialState: {
    health: 0.5,
    reactorLevel: 0.6,
    isPaused: false
  },
  
  timeline: [
    {
      type: 'server_event',
      event: 'GAME_STATE',
      data: { health: 0.5, reactorLevel: 0.6 }
    },
    {
      type: 'delay',
      ms: 2000
    },
    {
      type: 'server_event',
      event: 'REACTOR_OFFLINE',
      data: { reactorId: 'reactor_01' }
    },
    {
      type: 'ui_trigger',
      action: 'disable_button',
      target: 'reactor_01',
      delay: 100
    },
    {
      type: 'delay',
      ms: 3000
    },
    {
      type: 'server_event',
      event: 'REACTOR_OFFLINE',
      data: { reactorId: 'reactor_02' }
    },
    {
      type: 'ui_trigger',
      action: 'disable_button',
      target: 'reactor_02',
      delay: 100
    }
  ]
};
```

---

## Verification Plan

### Automated Tests

Not applicable for initial implementation - this is a development tool.

---

### Manual Verification

#### Test 1: Director Mode Activation

**Steps:**
1. Navigate to `http://localhost:5173/?mode=test`
2. Verify debug overlay appears in top-right corner
3. Verify console shows "🎬 DIRECTOR MODE ACTIVATED"

**Expected Result:** Overlay visible, no errors in console.

---

#### Test 2: Scenario Loading

**Steps:**
1. Open scenario dropdown
2. Select "Engineer - Normal Operation"
3. Click "Load Scenario"
4. Verify scene loads with engineer controls

**Expected Result:** Scene loads successfully, event log shows scenario loaded.

---

#### Test 3: Timeline Execution

**Steps:**
1. Load "Engineer - Critical Damage" scenario
2. Watch event log for timeline events
3. Verify damage events appear in sequence
4. Check controller receives events

**Expected Result:** Events fire in correct order with proper delays.

---

#### Test 4: Production Mode Unchanged

**Steps:**
1. Navigate to `http://localhost:5173/` (no query parameter)
2. Verify no debug overlay appears
3. Verify normal application flow

**Expected Result:** Application works normally without Director.

---

## Implementation Order

1. **Create Director.js** - Core mock server
2. **Create scenario structure** - Folders and index
3. **Create example scenarios** - 3 engineer scenarios
4. **Create DebugOverlay.js** - UI controls
5. **Modify main.jsx** - Conditional initialization
6. **Export BLUEPRINT_MAP** - From sceneManager.js
7. **Test and iterate** - Verify all scenarios work

---

## Future Enhancements

1. **Scenario Recording** - Record user actions as new scenarios
2. **State Inspector** - View current game state in overlay
3. **Event Replay** - Replay recorded event sequences
4. **Mock Feature Injection** - Inject mock InterruptManager, etc.
5. **Multi-Scene Scenarios** - Test scene transitions
6. **Assertion System** - Automated verification of expected outcomes
