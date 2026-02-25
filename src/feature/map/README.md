# Map Feature

The Map feature provides a high-performance, interactive 2D grid system built with PixiJS v8 and `@pixi/layout`. It supports panning, zooming, coordinate labeling, and layered rendering for submarine navigation.

## Current Functionality

-   **Interactive Navigation**: Panning (drag/keyboard) and Zooming (wheel/pinch) via `MapBehaviors`.
-   **Layered Rendering**: Isolated layers for Background, Grid, Tracks (markers), Labels, and Overlays.
-   **Coordinate System**: 15x15 grid with alphanumeric labels (A-O, 1-15) that stay pinned to the axes during panning.
-   **Viewport Management**: Automatic clamping to prevent panning out of bounds and "Center On" functionality.
-   **Multi-mode Display**: Supports full map views and specialized "MiniMap" configurations.
-   **Intent System**: State-driven interaction (e.g., Waypoint placement, Torpedo targeting) via `MapStates` and `MapIntents`.

## Implementation Guide

To add a map to a scene, use the `createMapPanel` helper. This handles the creation of the `MapViewArea`, masking, and layout integration.

```javascript
import { createMapPanel } from '../feature/map/mapRenderer.js';

// Inside a Scene or Controller
const mapWidth = 800;
const mapHeight = 600;

const mapPanel = createMapPanel(
    app.ticker, 
    mapWidth, 
    mapHeight, 
    { x: 10, y: 10 } // Optional layout config
);

// Access the underlying MapViewArea for logic
const mapView = mapPanel.mapView;

// Set ownship position
mapView.setOwnShipPosition(7, 7, true); // (row, col, animate)

this.container.addChild(mapPanel);
```

### Components
- **`MapViewArea`**: The primary coordinator. Manages the view-state and child components.
- **`MapGrid`**: Handles the drawing of the grid and sector lines.
- **`MapLabels`**: Handles the rendering and positioning of A-O/1-15 axis labels.
- **`MapBehaviors`**: Attaches pointer and keyboard listeners for interaction.

## TODO / Priority Milestones

1.  **Ownship Socket Integration**
    - **Trigger**: Listen for `stateUpdate` events from `socketManager`.
    - **Logic**: Identify the local player's submarine. If the `row` or `col` differs from the current `ownship` position, call `mapView.setOwnShipPosition(row, col, true, isCentered)`.
    - **Auto-Centering**: Implement an inactivity timer (e.g., 2 seconds). If the user hasn't panned manually, the map should auto-center on the ownship when it moves.

2.  **Past Position Tracking (Breadcrumbs)**
    - **Data Source**: Use the `past_track` (snake_case) array from the server's submarine object.
    - **Rendering**:
        - Use `Graphics` for drawing connecting lines between historical points on the `tracks` layer.
        - Use a pool of `Sprite` objects (aliased as `map_dot`) for the circular breadcrumb nodes.
        - **Scaling**: Line width should be ~10% of `tileSize`; nodes should be ~20% of `tileSize`.
        - **Masking**: Implement a `maskCurrentPosition` flag. If true, do not render the node for the very last coordinate in the `past_track` array (to avoid overlap with the submarine sprite).
    - **Performance**: Ensure track nodes are pooled and only updated when the `past_track` length or `tileSize` (zoom) changes.

3.  **Terrain & Obstacle Rendering**
    - **Data Source**: The server provides a 2D `board` array (0 for WATER, 1 for LAND).
    - **Implementation**: Create a `MapTerrain` component that renders static `Graphics` or `TilingSprite` blocks on the `background` layer.
    - **Optimization**: Since terrain is static, bake it into a single `RenderTexture` or use a single `Graphics` object that only re-renders on zoom.

4.  **Smooth Zoom & Scale**
    - **Logic**: Implement a `setZoom(scale)` method in `MapViewArea` that uses a Ticker to interpolate `config.tileSize`.
    - **Stable Focus**: During zoom, calculate the offset change to keep the grid-local point at the center of the viewport stable (zoom-to-cursor/center).

