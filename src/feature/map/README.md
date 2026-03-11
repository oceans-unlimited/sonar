# Map Feature

The Map feature is a high-performance, role-aware 2D grid system built with PixiJS v8. It serves as the single application-wide entity for tracking, filtering, and visualizing spatial data.

## Core Responsibilities

1.  **Spatial Data Tracking**: Maintains the authoritative "World Map," including terrain, mine locations, path history, and temporary detections (Sonar pings).
2.  **Logical Integration**: Consumes positional data directly from the `SubmarineState` objects rather than raw network traffic.
3.  **Contextual Filtering**: Dynamically filters the World Map based on the client's assigned role (e.g., Captains see ownship path history and ownship mines; Sonar Operators see ownship position).
4.  **Data Bubbling**: Acts as a coordinate-to-data translator. Grid interactions (click/hover) emit a rich `SquareData` payload for scene-level decision making.

## Architecture: The Spatial Model Chain

The map feature separates the "What is where" (Data) from the "What is shown" (View) through a three-tier hierarchy.

### 1. Data Source: Submarine State
The Map does not communicate with the Server. It listens to the `SubmarineState` object (Data Normalizer & View Model).
- **Logical Events**: When the Submarine State emits `sub:moved`, the Map updates the ownship icon.
- **Rules**: The Map queries the Submarine State for permissions like `canPlaceMine()` or `isStealthActive()`.
- **See also**: [.design/realtime_engine.md](.design/realtime_engine.md) for the data flow specification.

### 2. Coordination: MapFeature (The Entity)
A persistent service that lives for the duration of the application.
- **The Spatial Model**: Tracks all positional entities.
- **Universal Memory**: Retains data that the server might not broadcast in every packet (e.g., the last 3 seconds of a Sonar ping visualization).

### 3. Rendering: MapViewArea & Overlays
The visual components used to render the grid.
- **Agnostic Visuals**: `MapOverlays` provide primitive drawing tools (ranges, highlights).
- **Intent-Based Overlays**: `MapIntentBehavior` translates high-level game intents (NAVIGATE, TORPEDO) into specific visual ranges.

## Contextual Filtering Rules
The Map Feature automatically filters the "World Map" based on the active role context provided by the controller:

| Element | Captain (CO) | Sonar | XO / Engineer |
| :--- | :--- | :--- | :--- |
| **Terrain** | Visible | Visible | Hidden (Layout-only) |
| **Path History** | Visible | Hidden | Hidden |
| **Own Mines** | Visible | Visible | Hidden |

## Implementation Details

- **`MapFeature`**: Persistent service managing the Spatial Model and Submarine State subscriptions.
- **`MapController`**: Scene-level broker. Configures the filtering and interaction mode for a specific map instance.
- **`MapViewArea`**: The structural orchestrator managing PIXI layers (background, grid, tracks, overlays).
- **`MapUtils`**: Pure logic hub for coordinate conversion, distance math, and grid bounds.

## Data Schema (`SquareData`)
When a grid square is interacted with, the map bubbles up the following payload:

```typescript
interface SquareData {
    coords: { row: number, col: number };
    sector: number;           // 1-9
    terrain: 'WATER' | 'LAND';
    alphaNumeric: string;     // e.g., "F3"
    isOwnMine: boolean;
    isInPastTrack: boolean;   // Path history presence
    range: number;            // Manhattan distance from ownship
}
```
