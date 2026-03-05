# Submarine Object Plan: Data Normalizer & View Model

This document specifies the structure and behavior of the `SubmarineState` class, which serves as the authoritative client-side model for a single submarine.

## 1. Data Tree Structure (Canonical Schema)
The `SubmarineState` object mirrors the schema from `logical-server.lib.js`, providing a structured view of the following data:

```text
SubmarineState
├── id (string)
├── name (string)
├── crew (Identity)
│   ├── co (playerId)
│   ├── xo (playerId)
│   ├── sonar (playerId)
│   └── eng (playerId)
├── spatial (Live Tracking)
│   ├── row (int)
│   ├── col (int)
│   ├── sector (int, 1-9)
│   ├── health (int, 0-4)
│   └── submarineState (string: SUBMERGED, MOVED, SURFACING, SURFACED, DESTROYED)
├── mechanics (Feature Data)
│   ├── past_track (Array<{row, col}>)      <-- RESET on Surfacing
│   ├── position_history (Array<{row, col}>) <-- PERSISTENT full log
│   ├── mines (Array<{row, col}>)
│   ├── engineLayout (Object)
│   └── actionGauges (Object: {sonar, torpedo, etc.})
└── context (State Metadata)
    └── submarineStateData
        ├── MOVED (Object: {directionMoved, engineerCrossedOutSystem, xoChargedGauge})
        └── SURFACING (Object: {roleTaskCompletion[]})
```

## 2. Class Specification

### Properties
- `this._id`: The unique submarine identifier (e.g., 'A').
- `this._data`: The raw internal cache of the most recent server update.
- `this._previousState`: The state string from the previous update.

### Constructor
- `constructor(id)`: Initializes a "shell" object with default values.

### Methods
#### Data Lifecycle
- `update(serverBlob)`: Deep-merges server data. Emits local events (e.g., `sub:moved`, `sub:damaged`).

#### Logical Queries (The "Why")
- `canMove()`: Returns `true` if `state === SUBMERGED` AND no global interrupts.
- `canFire(systemKey)`: Returns `true` if `SUBMERGED` and gauge is 100%.
- `isStealthActive()`: Returns true if the sub is currently executing a silence/stealth move.
- `isOwnship(playerId)`: Returns true if the local player is on this sub.
- `getRole(playerId)`: Returns player role key ('co', 'eng', etc.).

#### Formatted Getters (The "Facts")
- `getPosition()`: Returns `{ row, col, sector }`.
- `getHealth()`: Returns `{ current, max, percent, isCritical }`.
- `getTrack()`: Returns the current `past_track` array.
- `getHistory()`: Returns the full `position_history` array.
- `getStatusMessage()`: Returns human-readable status (e.g., "Awaiting Engineer Confirmation").

## 3. Communication Pattern
1. **Submarine** (the feature) calls `sub.update(rawSubData)`.
2. **SubmarineState** (the instance) identifies that `row` changed.
3. **SubmarineState** emits `sub:moved` via EventEmitter.
4. **MapController** (via registration) hears the event and instructs the **MapViewArea** to update.

## 4. Dependencies
- **[realtime_engine.md](../../.design/realtime_engine.md)**: Global communication chain.
- **[CONTROLLER_ARCHITECTURE.md](../../.plans/CONTROLLER_ARCHITECTURE.md)**: Controller consumption rules.
