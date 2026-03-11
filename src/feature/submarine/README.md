# Submarine Feature

The Submarine feature is the canonical "Data Normalizer & View Model" for vessel state. It owns the authoritative client-side model for all submarine instances and provides a high-level API that **replaces direct server state consumption** for scenes and controllers.

## Core Responsibilities

1. **Data Normalization**: Ingests raw server JSON via `socketManager` and normalizes it into structured `SubmarineState` instances.
2. **Identity Resolution**: Determines which submarine is "ownship" based on the local `playerId`.
3. **Change Detection**: Emits high-signal events (`sub:moved`, `sub:damaged`, `sub:stateChanged`) only when meaningful properties change.
4. **Logical Queries**: Provides gating functions (`canMove()`, `canFire()`) that other systems query instead of computing from raw state.

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

Other features may import the singleton directly for cross-feature integration:

```js
import { submarine } from '../submarine/submarine.js';
submarine.on('identity:resolved', ({ sub, role }) => { ... });
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
| `submarine:moved` | `submarine` (feature) | `{ id, row, col, ... }` |
| `submarine:allUpdated` | `submarine` (feature) | `Map<id, SubmarineState>` |
| `identity:resolved` | `submarine` (feature) | `{ sub, role }` |
