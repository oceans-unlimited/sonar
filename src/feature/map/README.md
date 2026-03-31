# Map Feature

The Map feature is a high-performance, role-aware 2D grid system built with PixiJS v8. It serves as the authoritative client-side model for global spatial data (terrain and mines) and provides a visualization layer for the vessel's environment.

## Core Responsibilities

1.  **Authoritative Spatial Database**: Acts as the absolute truth for terrain and mine locations.
2.  **Spatial Queries**: Provides the `getSpatialObstacles(coords, submarineId)` method for other features (like Submarine) to check for movement or deployment blocks.
3.  **Logical Integration**: Receives passive sync updates from the `Submarine` feature rather than listening directly to the network.
4.  **Contextual Filtering**: Dynamically filters the World Map based on the client's assigned role.
5.  **Data Bubbling**: Acts as a coordinate-to-data translator. Grid interactions (click/hover) emit a rich `SquareData` payload for scene-level decision making.

## Architecture: The Spatial Model Chain

The map feature separates the "What is where" (Data) from the "What is shown" (View).

### 1. Data Source: Injected Sync
The Map does not communicate with the Server for dynamic data. It receives sync calls from the `Submarine` and `SceneManager` features:
- **Terrain/Context**: Synced directly by `SceneManager.js` upon receiving a `stateUpdate` from the socket.
- **Mines**: Synced by `submarine.js` to maintain a global registry of all deployed mines and their owners.
- **Submarines**: The Map feature does NOT track submarine positions; it provides spatial data *to* the `Submarine` feature, and the `MapController` queries the `Submarine` feature for display data.

### 2. Coordination: MapManager (The Entity)
A persistent service that lives for the duration of the application.
- **The Spatial Model**: Tracks terrain and all positional entities like mines.
- **Obstacle Logic**: Implements the core logic for `OUT_OF_BOUNDS`, `BLOCKED_BY_TERRAIN`, and `BLOCKED_BY_MINE`.

### 3. Rendering: MapController & MapViewArea
- **`MapController`**: Persistent feature controller. Listens to `Submarine` feature events to trigger refreshes.
- **`MapViewArea`**: The structural orchestrator managing PIXI layers.
- **`MapIntentBehavior`**: Translates high-level game intents (NAVIGATE, TORPEDO) into specific visual ranges by querying the `SubmarineState` object.

## The Spatial Database API

The Map feature provides the `getSpatialObstacles(coords, submarineId)` method:

- **Logic**:
    1.  **OUT_OF_BOUNDS**: Returns immediately if coordinates are beyond the 15x15 grid.
    2.  **BLOCKED_BY_TERRAIN**: Returns if the terrain at the coordinate is `LAND`.
    3.  **BLOCKED_BY_MINE**: Returns if a mine is present and owned by the specified `submarineId`.
    4.  **CLEAR**: Returns if no spatial obstacles exist at the coordinate.

## Interaction & Data Bubbling

When a user interacts with the map (click/hover), the `MapController` emits a `squareSelected` event containing a `SquareData` payload. This payload combines spatial database facts with vessel-specific state.

### `SquareData` Schema
```typescript
interface SquareData {
    coords: { row: number, col: number };
    sector: number;           // 1-9
    terrain: 'WATER' | 'LAND' | 'UNKNOWN';
    alphaNumeric: string;     // e.g., "F3"
    isOwnMine: boolean;       // Queries SubmarineState.hasMineAt()
    isInPastTrack: boolean;   // Queries SubmarineState.isInPastTrack()
    isCurrentWaypoint: boolean;
    isCurrentTarget: boolean;
    range: number;            // Manhattan distance from ownship
    isValidCoords: boolean;
}
```

## Contextual Filtering Rules
Rendering layers are toggled based on the active role context:

| Element | Captain (CO) | Sonar | XO / Engineer |
| :--- | :--- | :--- | :--- |
| **Terrain** | Visible | Visible | Hidden (Layout-only) |
| **Path History** | Visible | Hidden | Hidden |
| **Own Mines** | Visible | Visible | Hidden |
