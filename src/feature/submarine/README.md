# Submarine Feature

The Submarine feature is the canonical "Data Normalizer & View Model" for vessel state. It owns the authoritative client-side model for all submarine instances and provides a high-level API that **replaces direct server state consumption** for scenes and controllers.

## Core Responsibilities

1. **Data Normalization**: Ingests raw server JSON via `socketManager` and normalizes it into structured `SubmarineState` instances.
2. **Identity Resolution**: Determines which submarine is "ownship" based on the local `playerId`.
3. **Change Detection**: Emits high-signal events (`sub:moved`, `sub:damaged`, `sub:stateChanged`) only when meaningful properties change.
4. **Logical Queries**: Provides gating functions (`canMove()`, `canFire()`) that other systems query instead of computing from raw state.
5. **Move Validation**: Owns the logic for determining valid movement directions. It queries the Map feature for spatial obstacles (land, mines) but performs its own internal checks for past tracks and U-turn restrictions.

## Move Validation Process
The submarine feature implements movement validation using the following priority:
1. **Direction Check**: Immediately reject the cardinal opposite of the last move (U-turn). This applies to both standard and stealth moves.
2. **Track Check**: Verify the target coordinate is not in the submarine's own `past_track`.
3. **Spatial Check**: Query the Map feature's `getSpatialObstacles(coords, submarineId)` method.
    - If Map returns `CLEAR`, the move is valid.
    - If Map returns `BLOCKED_BY_TERRAIN`, `BLOCKED_BY_MINE`, or `OUT_OF_BOUNDS`, the move is rejected.

### Stealth (Silence) Logic
When a stealth move is requested:
1. **Range**: Calculate potential moves for the 3 valid cardinal directions up to a range of 4 squares.
2. **No Jumping**: For each direction, validate squares sequentially (1 to 4). If a square at distance `d` is blocked (by terrain, mine, or past track), all squares at distance `d+1` and beyond in that direction are also considered invalid.
3. **Information Hiding**: Stealth moves emit a generic "move" event to opposing roles without direction data, while the ownship Captain retains full "Past Track" visibility.

## Architecture

```
submarine/
├── submarine.js              // Feature singleton: manages SubmarineState lifecycle
├── SubmarineState.js          // View Model: single sub instance with data + queries
├── SubmarineController.js     // Controller facade: safe API for scene controllers
├── submarineTransitions.js    // Constants: legal state transition map
├── SUBMARINE_OBJECT_PLAN.md   // Design specification
├── TODO.md                    // Implementation tracking
└── README.md
```

### Data Flow

```
Server → socketManager → submarine.handleStateUpdate(state)
    → SubmarineState.update(subData)
        → emits sub:moved, sub:damaged, sub:stateChanged
    → submarine emits submarine:moved, submarine:allUpdated, identity:resolved
```

### Component Roles

| File | Role | Rules |
|:---|:---|:---|
| `submarine.js` | **Feature Singleton** | Persistent service. Listens to `socketManager`. Manages registry of `SubmarineState` instances. Resolves ownship identity. |
| `SubmarineState.js` | **View Model** | Per-submarine data cache. Normalizes server JSON. Emits local change events. Exposes logical queries and formatted getters. |
| `SubmarineController.js` | **Controller Facade** | Injected into scene controllers via `SceneManager.features`. Proxies queries to the singleton. Provides safe event subscription. |
| `submarineTransitions.js` | **Constants** | Legal state transition map (SUBMERGED → MOVED, etc.). |

## Usage

### Consuming in a Scene Controller

The `SubmarineController` facade is automatically injected by `SceneManager` into all controllers as `this.features.get('submarine')`:

```js
// In any scene controller:
const sub = this.features.get('submarine');
const position = sub.getOwnship()?.getPosition();
const health = sub.getHealth();
const canMove = sub.canMove();
```

### Subscribing to Events

```js
// In a controller's onFeaturesBound():
this.subscribeToFeature('submarine', 'submarine:moved', (data) => {
    // React to position change
});
```

### Direct Singleton Access (Feature-to-Feature Only)

Other features may import the singleton directly for cross-feature integration (e.g., `DamageController` or `TeletypeController` monitoring global state):

```js
import { submarine } from '../submarine/submarine.js';
submarine.on('identity:resolved', ({ sub, role }) => { ... });
submarine.on('submarine:stateChanged', (data) => { ... });
```

> **Important**: Scene controllers must **always** use the injected `SubmarineController` facade, never the raw singleton.

## Key Rules

### Scenes & Controllers Must Use the Submarine Feature

> **All role-based scenes and the map feature should listen and respond to the Submarine singleton, not the server directly, wherever possible.**

| Pattern | Status |
|:---|:---|
| Controllers query `SubmarineController` for state | ✅ Correct |
| Controllers subscribe to feature events via `subscribeToFeature()` | ✅ Correct |
| Controllers read `socketManager.lastState.submarines[0]` | ❌ Anti-pattern |
| Scenes parse raw `state.submarines` for data | ❌ Anti-pattern |

The submarine feature exists precisely to normalize server data. Bypassing it leads to:
- Duplicated parsing logic across controllers
- Missed change detection (no events fired)
- Broken identity resolution (which sub is ours?)

### Event Reference

| Event | Source | Payload |
|:---|:---|:---|
| `sub:moved` | `SubmarineState` | `{ row, col, sector, alphaNumeric }` |
| `sub:damaged` | `SubmarineState` | `{ current, max, percent, isCritical }` |
| `sub:stateChanged` | `SubmarineState` | `{ state, previous }` |
| `sub:updated` | `SubmarineState` | Full `_data` object |
| `sub:engineUpdated` | `SubmarineState` | `{ layout, previousCount, newCount, wasReset }` |
| `submarine:moved` | `submarine` (feature) | `{ id, row, col, ... }` |
| `submarine:stateChanged` | `submarine` (feature) | `{ id, state, previous }` |
| `submarine:allUpdated` | `submarine` (feature) | `Map<id, SubmarineState>` |
| `identity:resolved` | `submarine` (feature) | `{ sub, role }` |
