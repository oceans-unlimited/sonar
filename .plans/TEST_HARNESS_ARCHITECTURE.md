# Test Harness Architecture Plan: "Director Mode"

## Overview
To allow for rapid iteration and testing of specific scenes (e.g., "Engineer Station", "Captain View") without requiring a full 8-player network lobby launch, we will implement a **Client-Side Test Harness** (internally called the **Director**).

The Director acts as a **Mock Server** and **Scenario Manager**. It intercepts the standard dependency injection flow to provide "fake" sockets, pre-configured game states, and direct scene navigation.

---

## Core Components

### 1. The Director (Mock Server)
*   **Role:** Replaces the `Socket.io` client instance.
*   **Behavior:**
    *   Implements the standard Socket interface (`on`, `emit`, `off`).
    *   Route messages internally or logs them to the console ("Mock Emit").
    *   Exposes a **Control API** (`loadScenario`, `triggerEvent`) that the Test Overlay can call.
*   **Key Capability:** It allows the application to run completely offline while "thinking" it is connected to a server.

### 2. Scenarios (Scripts)
*   **Definition:** A Scenario is a JSON/JS object that defines a specific starting state.
*   **Structure:**
    *   `scene`: The target scene key (e.g., `'engineer'`).
    *   `state`: The initial mock game state (e.g., `{ reactorLevel: 0.5, isPaused: false }`).
    *   `features`: Mock feature configurations (e.g., `{ interrupts: { active: null } }`).
*   **Multiple Scripts:** We can organize scenarios into files (e.g., `scenarios/engineering.js`, `scenarios/combat.js`).

### 3. Test Overlays (The UI)
We will support **Multiple Overlays** via a modular Debug System.

*   **Primary Overlay (Scenario Select):** A dropdown/list to jump between Scenarios.
*   **Context Overlays (Role-Specific):**
    *   *Engineer Debug:* Sliders to force reactor heat, toggle damage events.
    *   *Captain Debug:* Buttons to trigger "Incoming Message" or "Collision Alert".
*   **Implementation:** Simple HTML/DOM elements `index.html` floating above the PixiJS Canvas (z-index: 9999).

---

## Architecture Integration

### The Entry Point (`main.jsx`)
We will use a URL query parameter or build flag to switch modes.

```javascript
// Pseudocode for main.jsx
const isDevMode = window.location.search.includes('mode=test');

if (isDevMode) {
    const director = new Director();
    const manager = new SceneManager(app);
    
    // Inject the Mock Director instead of a real Socket
    manager.init(director); 
    
    // Mount the Debug UI
    mountDebugOverlay(director);
} else {
    // Standard Production Flow
    const socket = io();
    new SceneManager(app).init(socket);
}
```

---

## Implementation Plan

### Step 1: The Director Class
Create `src/debug/Director.js`.
*   Maintain a registry of event listeners (`this.listeners = {}`).
*   Implement `on(event, fn)`, `emit(event, data)`, `off(event)`.
*   Implement `loadScenario(scenarioDef)`.

### Step 2: Scenario Definitions
Create `src/debug/scenarios/`.
*   Define `engineer_basic.json`: Loads Engineer controller, normal state.
*   Define `engineer_critical.json`: Loads Engineer controller, 10% health, active damage alerts.

### Step 3: The Debug Overlay
Create `src/debug/Overlay.js`.
*   A simple vanilla JS component that appends a `<div id="debug-panel">` to the body.
*   Populate it with buttons generated from the list of available Scenarios.

### Step 4: Feature Mocks
Ensure the `Director` can also inject **Mock Features**.
*   Instead of the real `InterruptManager`, inject a `MockInterruptManager` that logs calls instead of stopping the clock.
*   This allows isolated unit-testing of controllers.

---

## Benefits
1.  **Instant Startup:** Boot directly into "Engine Room - Combat Mode" in <1 second.
2.  **Edge Case Testing:** Easily reproduce rare states (e.g., "0.1% Hull Integrity") via a script.
3.  **Role Isolation:** Developers working on the Engineer view don't need to run the Captain view.
4.  **No Server Required:** Design and UI polish can happen purely on the frontend.
