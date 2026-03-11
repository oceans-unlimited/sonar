# Controllers

Controllers are the transient logical coordinators for specific scenes. They act as the "Director" of the current view, bridging persistent application features to the scene's visual components.

## Key Principles

1.  **Transient Lifespan**: Controllers are instantiated by the `SceneManager` when a scene mounts and are destroyed when the scene unmounts.
2.  **Feature-First Data**: Controllers should consume "Facts" from persistent features (like the `Submarine` or `Map` features) rather than parsing raw network traffic.
3.  **Intent-Based Outbound**: Controllers are responsible for emitting player "Intents" (e.g., `move`, `fire`) directly to the `socketManager`.
4.  **Action Mapping**: Logic is routed through a central `this.handlers` map to keep code declarative and compatible with **Director Mode** (mock events).

## Communication Flow

### 1. Facts (Inbound)
`Server` → `socketManager` → `Feature (Normalizer)` → `Controller` → `UI Behavior`
- Features listen to the raw socket and emit high-signal events (e.g., `sub:moved`).
- Controllers subscribe to these feature events in `onFeaturesBound()`.

### 2. Intents (Outbound)
`UI Behavior` → `Controller` → `socketManager` → `Server`
- Buttons/Interactions trigger methods on the Controller.
- The Controller validates the intent locally (asking the feature `canMove()`) and then emits to the socket.

## BaseController Requirements

To support the "Feature-First" architecture, the `BaseController` must provide the following:

- **Feature Injection**: A `bindFeatures(registry)` method that receives and freezes the global feature set.
- **Lifecycle Hooks**:
    - `onFeaturesBound()`: The primary entry point for controllers to subscribe to persistent feature events.
    - `onGameStateUpdate(state)`: Used only for global synchronization (e.g., Phase changes) that isn't yet captured by a specific feature.
- **Auto-Cleanup**: A mechanism to track and remove feature listeners during `destroy()` to prevent memory leaks and "ghost" updates when swapping scenes.
- **Standardized Routing**: `handleEvent(type, data)` must remain the single ingress point for all logic, ensuring that manual UI triggers and automated feature updates follow the same path.

## Directory Layout

- `baseController.js`: Abstract parent class containing routing and registration logic.
- `connController.js`: Coordinates the Captain's station (Helm & Map).
- `engineerController.js`: Manages the Engineer's station (Circuits & Damage).
- `xoController.js`: Manages the First Officer's station (Gauges & Charging).
- `colorTestController.js`: Diagnostic tool for logic and visual testing.

## Best Practices & Gotchas

### 1. Identity Race Conditions
Persistent features (like the `Submarine` feature) often resolve the player's identity (Sub A vs Sub B) immediately upon application startup. Transient scene controllers may mount long after this event has fired.
- **Rule**: Controllers should check for an *already resolved* identity in `onViewBound` in addition to subscribing to the resolution event in `onFeaturesBound`.

### 2. Map-Based Registries
The `BaseController` uses ES6 `Map` objects for `this.buttons`, `this.visuals`, and `this.features`.
- **Rule**: Always use `.get(id)` and `.set(id, val)` instead of plain object access to ensure compatibility with standardized cleanup and lookup logic.

### 3. Feature Cleanup
To prevent memory leaks, always use `this.subscribeToFeature(key, event, handler)`. Never call `feature.on()` directly inside a controller, as it will persist after the scene is destroyed and lead to "Ghost" logic execution.

## Dependencies
- **[realtime_engine.md](../../.design/realtime_engine.md)**: Defines the global data hierarchy.
- **[SUBMARINE_OBJECT_PLAN.md](../feature/submarine/SUBMARINE_OBJECT_PLAN.md)**: Defines the primary data source for controllers.
