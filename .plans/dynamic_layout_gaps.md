# Dynamic Layout Gaps & Implementation Plan

## Context
The Engineering Scene requires a dynamic layout where the visual identity ("System") of certain buttons (slots) is assigned by the server at runtime. Most other scenes use static blueprints. We must bridge the gap between our static blueprint architecture and this dynamic requirement without breaking the separation of concerns.

## Identified Gaps

### 1. Visual Mutability (Button Renderer)
*   **Issue:** The `Button` class is currently "construct-once". It lacks an API to update its background texture or tint after initialization.
*   **Gap:** We cannot change a button's appearance (e.g., from "Empty Slot" to "Weapons System") once it's on screen.
*   **Solution:** Implement `updateButton()` in `src/render/button.js` to allow hot-swapping of textures and tints.

### 2. State-Driven Layout (Engineer Controller)
*   **Issue:** `EngineerController` currently assumes the UI state is fixed. It lacks logic to parse the `engineLayout` from the `GAME_STATE` event and apply it to the UI.
*   **Gap:** The controller receives the data but doesn't know how to translate "Slot 1 is Weapons" into "Update Button 1 to use Weapon Assets".
*   **Solution:** Implement `onGameStateUpdate(state)` in `EngineerController` to iterate through `state.engineLayout` and call `updateButton()` on the relevant registered buttons.

### 3. Blueprint vs. Dynamic Content
*   **Issue:** The `testScene.json` blueprint defines static assets.
*   **Gap:** The scene loads with "default" slot visuals. We need a way to transition them to their assigned systems immediately upon receiving state.
*   **Solution:** 
    *   Keep `testScene.json` as the structural skeleton (defining IDs like `slot_01`).
    *   Use `EngineerController` as the compositor. When it receives the initial state (or subsequent updates), it applies the visual "skin" to the skeleton.

## Proposed Implementation Plan

### Step 1: Enhance Button Renderer [Render Layer]
Update `src/render/button.js` to include the `updateButton` method. This respects the **Render** responsibility by providing a mechanism to change visuals without containing business logic.

```javascript
// src/render/button.js
updateButton(bgImage, bgTint, frameColor = bgTint, overlayColor = bgTint) {
    if (bgImage) {
        const texture = Assets.cache.get(bgImage);
        if (texture) this.background.texture = texture;
    }
    // ... update tints ...
    return this;
}
```

### Step 2: Implement Controller Logic [Control Layer]
Update `src/control/engineerController.js`.
*   Override `onGameStateUpdate(state)`.
*   Map server system types (e.g., `SYS_TORPEDO`) to client assets (e.g., `torpedo_sys.svg`).
*   Iterate through the `engineLayout` and call `this.buttons[id].visuals.updateButton(...)`.
    *   *Note:* We need to ensure `this.buttons[id]` exposes the visual object or a wrapper that allows this call. Currently `wireButton` returns an API. We might need to expose the visual through that API or a parallel visual registry.

### Step 3: Decorator Integration (Optional/Alternative) [Render Layer]
The user suggested using `decorateEngineerScene`. 
*   **Approach:** The controller could pass the state to the decorator. 
*   **Constraint:** Decorators are typically run *once* at creation. 
*   **Refinement:** If the decorator is only for *static* setup, the Controller is the better place for *dynamic* updates (as per "Controllers translate server state into UI intent"). 
*   **Hybrid:** The Decorator could register a "Visual Update Helper" with the controller, keeping the specific asset mappings (System -> SVG) inside the Render layer (Decorator) instead of the Controller. This keeps the Controller pure (dealing with logic/IDs) and the Decorator pure (dealing with assets/Pixi).

## System Architecture Alignment
This plan adheres to `client-side-architecture.md`:
*   **Renderers (Button):** Only handle Pixi object manipulation (`updateButton`).
*   **Controllers:** specific logic (`EngineerController`) coordinates state (`onGameStateUpdate`) and routes intent to the UI.
*   **Separation:** The Controller decides *what* needs to happen ("Slot 1 becomes Weapons"), the Button handles *how* it looks.


## Planned server-side behavior and sequencing

  1. Server-Side Generation (Source of Truth)
  The layout is dynamically generated on the server to ensuring all clients (and the game logic) share the same configuration.

   * File: `logical-server.lib.js` & `engineLayout.lib.js`
   * Action: When the LogicalServer initializes (or when startGame() is called), it calls createSubmarine(id).
   * Process:
       1. createSubmarine instantiates new EngineLayoutGenerator().
       2. It calls .generateLayout(), which constructs a complex object containing:
           * directions: A map of 'N', 'S', 'E', 'W' containing randomized frameSlots and reactorSlots assignments (e.g., assigning
             'weapons', 'stealth', 'detection', 'reactor' to specific slots).
           * circuits: An array of circuit objects, each defining a color and a list of connections (specific slots that belong to
             this circuit).
           * crossedOutSlots: An initially empty array to track damage.
       3. This object is stored in the game state at state.submarines[i].engineLayout.

  2. Transmission (Socket.io)
  The server broadcasts the entire game state, including the generated layout, to all connected clients.

   * File: `server.lib.js`
   * Action: Whenever a significant event occurs (player connection, startGame, or gameplay actions like cross_off_system), the
     server triggers an update.
   * Process:
       1. The server executes ioServer.emit("state", logicalServer.state).
       2. This payload includes the full submarines array, which contains the engineLayout objects generated in step 1.

  3. Client Reception
  The client receives the raw state and creates an internal event to notify the rest of the application.

   * File: `socketManager.js` (to be added to core to handle socket events)
   * Action: The socket client receives the 'state' message.
   * Process:
       1. socket.on('state', (state) => { ... }) triggers.
       2. The state is cached in this.lastState.
       3. The manager emits an internal PixiJS event: this.emit('stateUpdate', state).