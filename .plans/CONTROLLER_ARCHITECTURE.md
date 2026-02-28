# Polymorphic Controller Architecture Plan

## Overview
To support unique logic for different scenes (Captain, Engineer, Lobby, etc.) without creating a monolithic "giant switch statement," we will adopt a **Polymorphic Architecture** with **Action Mapping**.

This pattern decouples the "Mechanism" (event routing, registration) from the "Business Logic" (specific game rules), allowing for scalable, role-specific controllers.

**Core Pattern:**
- **BaseController**: Central router + globals + common mechanics.
- **Role Controllers**: Extend Base, register specific handlers, listen for specific socket events.
- **SceneManager**: Acts as the factory using a `CONTROLLER_MAP`.

## Architecture

### 1. BaseController (The Router)
*   **File:** `src/control/baseController.js`
*   **Role:** Parent class for ALL scene controllers (Game, Lobby, Menu).
*   **Responsibilities:**
    *   **Registry:** Maintains `this.buttons = {}` (Button ID → API).
    *   **Action Map:** Uses `this.handlers = {}` to map Event Names → Handler Functions.
    *   **Routing:** `handleEvent(event, data)` is the **primary ingress point** for:
        *   UI Interactions (Clicks, Toggles)
        *   Internal Timers (Cooldowns)
        *   Feature Notifications (Minigame complete)
        *   *Note: Not for high-frequency game loop updates.*
    *   **Logging:** Centralized `console.log` for all routed events.
    *   **Partial Operation:** Supports offline-first/pre-bind operation (queues or drops actions safely).
    *   **Feature Injection:** Receives frozen feature registry.

**Lifecycle Hooks (for Subclasses):**
*   `onSocketBound()`: Add role-specific socket listeners.
*   `onSocketUnbound()`: Cleanup listeners.
*   `onFeaturesBound()`: Validate required features, subscribe to feature events, sync initial state.
*   `onGameStateUpdate(state)`: Role-specific reaction to global state changes.

**Global Behaviors:**
*   **Disconnect:** triggers `handleSystemIsolation({ id: null, isActive: true })` (Full Lockdown).
*   **Game State:** Logs state and calls `onGameStateUpdate`.

### 2. Role Controllers (The Implementations)
*   **File:** `src/control/${role}Controller.js` (e.g., `engineerController.js`, `lobbyController.js`)
*   **Extends:** `BaseController`
*   **Responsibilities:**
    *   Define role-specific `this.handlers` in the constructor.
    *   Implement business logic methods.
    *   Manage role-specific socket listeners (`onSocketBound`).
    *   Interact with specific Features (e.g., `this.features.reactor`).
    *   **Note:** This applies to *all* scenes. A `LobbyController` simply has a smaller map and ignores game-specific features.

**Constructor Pattern:**
```javascript
constructor() {
    super();
    this.handlers = {
        ...this.handlers, // Inherit globals (ISOLATE_SYSTEM, etc.)
        
        /** 
         * TRIGGER: User clicks reactor button.
         * DATA: { id: string } 
         */
        'ENG_PWR': (d) => this.handleReactorPower(d),

        /** 
         * TRIGGER: Circuit slot filled.
         * DATA: { id: string, itemType: string } 
         */
        'SLOT_STAT': (d) => this.handleSlotStatus(d)
    };
}
```

### 3. SceneManager (The Factory)
*   **File:** `src/core/sceneManager.js`
*   **Responsibilities:**
    *   Load the requested scene module from `src/scenes/`.
    *   Instantiate the correct controller class from a `CONTROLLER_MAP` based on the scene's designated controller key (e.g., 'engineer').
    *   Inject Dependencies: `bindSocket(socket)` and `bindFeatures(features)`.
    *   Manage Button Lifecycle (Create/Destroy visuals).

---

## Key Concepts & Clarifications

### 1. Action Map vs. Handlers
*   **Concept:** "Action Mapping" is the architectural pattern (Event → Function).
*   **Implementation:** `this.handlers` is the variable that stores this map. They are the same thing.

### 2. The [Source, Received, Response] Model
Every interaction follows this data flow:
*   **Source:** The Trigger (Event Name, e.g., `'ENG_PWR'`).
*   **Received:** The Data Payload (e.g., `{ id: 'reactor_1' }`).
*   **Response:** The Mapped Function (e.g., `handleReactorPower`).

### 3. Button Lifecycle Ownership
*   **SceneManager:** Owns the **Visuals**. It creates them and destroys them (calling `pixiObj.destroy()`).
*   **Controller:** Owns the **Logic**. It only holds *references* to the buttons.
*   **Cleanup:** `BaseController.destroy()` clears the references (`this.buttons = {}`) but does *not* destroy the buttons themselves, preventing double-destroy errors.

### 4. Offline-First & Socket Injection
*   Controllers are instantiated *before* sockets are bound.
*   `this.socket` starts as `null`.
*   **Rule:** All emission logic must check `if (this.socket)` to prevent crashes during loading or disconnection.
*   **Testing Pathway (Director Mode):** When activated via `?mode=test`, the real socket is replaced by a `Director` instance in `main.jsx`. This instance (or a Manager wrapping it) is injected into the controller via `bindSocket(socket)`.

### 5. System Isolation (Lockdown / Disconnect)
*   **Event:** `'ISOLATE_SYSTEM'` (or `'disconnect'` from socket).
*   **Parameter:** `{ isActive }` (The state of the *triggering* button, or true for lockdown).
*   **Logic:**
    *   `isActive: true` (Trigger ON / Disconnect) → **Disable** all other buttons (Exclusive Mode).
    *   `isActive: false` (Trigger OFF) → **Enable** all other buttons (Release Mode).
*   **Implementation:** The BaseController automatically listens for the `disconnect` event on the injected socket and triggers a full system lockdown (`isActive: true`), providing visual feedback that the station is offline.

### 6. Visual Registration & Color Control
Controllers can manage non-interactive UI elements (Panels, ButtonBlocks, Sprites) by registering them as "visuals". This allows the controller to drive visual feedback (tinting, visibility) based on game events.

*   **Registration**: In the Scene, call `controller.registerVisual(uniqueId, pixiObject)`.
*   **Manipulation**: In the Controller, access `this.visuals[uniqueId]` and use the `ColorOps` utility or direct component methods.

**Example: Dynamic UI Feedback**
```javascript
// src/control/myController.js
import { setColor, cascadeColor } from '../render/util/colorOps.js';
import { Colors } from '../core/uiStyle.js';

handleStatusChange(data) {
    const { status } = data;
    const panel = this.visuals['main_panel'];
    const block = this.visuals['systems_block'];

    if (status === 'critical') {
        // Direct method (calls panel.setBorderColor)
        if (panel.setBorderColor) panel.setBorderColor(Colors.danger);
        
        // Cascading method (targets header elements in block)
        cascadeColor(block, Colors.danger, 'blockLabel');
    }
}
```

---

## 7. Implementation Details (Reference Code)

### A. The Base Controller
**File:** `src/control/baseController.js`

```javascript
export class BaseController {
    constructor() {
        this.buttons = {};
        this.socket = null;     // Injected via bindSocket
        this.features = {};     // Injected via bindFeatures

        // Action Mapping
        this.handlers = {
            'ISOLATE_SYSTEM': (d) => this.handleSystemIsolation(d)
        };
    }

    registerButton(id, api) {
        this.buttons[id] = api;
    }

    /**
     * The "Router". Primary Ingress for discrete actions.
     */
    handleEvent(event, data) {
        const handler = this.handlers[event];
        console.log(`[Controller] Routing: ${event}`);

        if (handler) {
            handler(data);
        } else {
            console.warn(`[Controller] No handler defined for: ${event}`);
        }
    }

    bindSocket(socket) {
        this.socket = socket;
        this.socket.on('disconnect', () => this.handleDisconnect());
        // Manager normalizes server's 'GAME_STATE' to 'stateUpdate'
        this.socket.on('stateUpdate', (state) => this.handleGameState(state)); 
        this.onSocketBound();
    }

    bindFeatures(featureRegistry) {
        this.features = Object.freeze({ ...featureRegistry });
        this.onFeaturesBound();
    }

    // --- Hooks ---
    onSocketBound() {}
    onSocketUnbound() {}
    onFeaturesBound() {} 
    onGameStateUpdate(state) {}

    // --- Global Logic ---

    handleSystemIsolation({ id, isActive }) {
        Object.keys(this.buttons).forEach(btnId => {
            if (btnId !== id) this.buttons[btnId].setEnabled(!isActive);
        });
    }

    handleDisconnect() {
        console.warn('Socket disconnected. Initiating Lockdown.');
        this.handleSystemIsolation({ id: null, isActive: true });
    }

    handleGameState(state) {
        console.log('Global State Sync:', state);
        this.onGameStateUpdate(state);
    }

    destroy() {
        if (this.socket) {
            this.socket.off('disconnect');
            this.socket.off('stateUpdate');
            this.onSocketUnbound();
            this.socket = null;
        }
        this.features = {}; 
        this.buttons = {}; 
    }
}
```

### B. The Specific Controller
**File:** `src/control/engineerController.js`

```javascript
import { BaseController } from './baseController.js';

export class EngineerController extends BaseController {
    constructor() {
        super();
        this.handlers = {
            ...this.handlers, 
            'ENG_PWR': (d) => this.handleReactorPower(d)
        };
    }

    onFeaturesBound() {
        if (!this.features.reactor) throw new Error("EngineerController requires Reactor feature");
    }

    onSocketBound() {
        this.socket.on('ENGINE_DAMAGE', (data) => this.handleDamage(data));
    }
    
    onSocketUnbound() {
        this.socket.off('ENGINE_DAMAGE');
    }

    handleCrossOff(data) {
        // Data contains { id, address, isActive }
        // We need to parse direction and slotId from the ID "DIR:SLOT"
        const { id } = data;
        const [direction, slotId] = id.split(':');

        console.log(`[EngineerController] Crossing off: ${direction} ${slotId}`);
        
        // Emit to server via socketManager
        if (this.socket) {
            // Note: In real app, socketManager handles the emit, but controller drives it.
            // socketManager.crossOffSystem(direction, slotId);
            this.socket.emit('cross_off_system', { direction, slotId });
        }
    }

    handleDamage({ reactorId }) {
        // Example: handle incoming damage
    }
}
```

### C. The Factory Logic
**File:** `src/core/sceneManager.js`

```javascript
const CONTROLLER_MAP = {
    'default': BaseController,
    'engineer': EngineerController,
    'lobby': LobbyController
};

// ... inside loadScene(sceneKey) ...

const ControllerClass = CONTROLLER_MAP[sceneKey] || CONTROLLER_MAP.default;

this.currentController = new ControllerClass();

if (this.app.socket) {
    this.currentController.bindSocket(this.app.socket);
}
if (this.features) {
    this.currentController.bindFeatures(this.features);
}
```

## Next Steps

1.  **Refactor**: Rename/Move `SceneController` to `BaseController`. [COMPLETED]
2.  **Implement**: Create `EngineerController` and move reactor logic there. [COMPLETED]
3.  **Update**: Modify `SceneManager` to use the `CONTROLLER_MAP` factory pattern. [COMPLETED]
4.  **Verify**: Ensure the modular scene pattern is fully adopted and `blueprint` parsing is removed. [COMPLETED]