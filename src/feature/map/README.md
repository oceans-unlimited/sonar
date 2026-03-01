# Map Feature

The Map feature provides a high-performance, interactive 2D grid system built with PixiJS v8 and `@pixi/layout`. It follows a **Controller-Embedded Architecture**, where every map instance is paired with a `MapController` to handle server synchronization and filtered rendering.

## Architecture & Integration

### Embedded Controller
The Map feature is designed to be self-managing. When instantiated (typically via `createMapPanel`), it embeds a `MapController` which handles:
- **Direct Socket Synchronization**: Listens directly to `stateUpdate` events from the `socketManager`.
- **Filtered Visuals**: Decides what to render based on the player's submarine, role, and the current game context.
- **API Hooks**: Exposes a standard set of methods for parent scene controllers to request map actions without needing to know internal PixiJS details.

### Parent Scene API
Parent scenes (e.g., `ConnScene`, `XO_Scene`) interact with the map via the following hooks on the `mapView` object:
- `mapView.setIntent(intent)`: Switches the map into a specific interaction mode (e.g., `NAVIGATE`, `TORPEDO`, `MINE_SELECT_ACTIVE`, `ROW_SELECT`, `SECTOR_SELECT`).
- `mapView.clearSelection()`: Resets all manual overlays and highlights.
- `mapView.centerOnOwnShip()`: Forces the camera to center on the player's submarine.

## Data Schema (Canonical Conformance)
Rendering logic strictly follows the server-side naming conventions found in `logical-server.lib.js`:
- `row` / `col`: Integers (0-14) representing current submarine coordinates.
- `past_track`: Array of `{row, col}` objects representing breadcrumbs.
- `mines`: Array of `{row, col}` objects representing active mine positions.
- `board`: 2D Array of integers where `0` is `WATER` and `1` is `LAND`.

## Universal Filtering System (Logic Outline)

The `MapController` implements a universal parsing system within `onGameStateUpdate` to determine map data visibility. This system answers four critical questions for every `stateUpdate`:

### 1. Which submarine does this client belong to?
- **Logic**: Identify the local `playerId` (from `socket.playerId`) and locate the index within the `submarines` array where `sub.co`, `sub.xo`, `sub.sonar`, or `sub.eng` matches. This will be cached within the controller for quick lookups and refreshed only on disconnect/reconnect events.
- **Result**: Sets the "Ownship" and role identity. All other submarines in the `submarines` array are treated as "Enemies".

### 2. What is the current context?
- **Global Context**: Is the `phase` `LIVE` or `INTERRUPT`?
- **Active Interrupt**: Is there a `SONAR_PING`, `DRONE`, or `TORPEDO_RESOLUTION` active?
- **Submarine State**: Is our ship `SUBMERGED`, `SURFACING`, or `DESTROYED`?

### 3. What is my role/map scale?
Role `xo` and `xoScene` will only see the minimap display with reduced detail. No terrain(land/water), no mines, just position and selection highlights.
Role `eng` and `engineerScene` will not see any map displays
Role `co` and `connScene` will see the full scale map in multiple states/modes
Role `sonar` and `sonarScene` will see a tactical scale map in multiple states/modes (not yet implemented)

### 4. What should I see in the current context?
The controller toggles layers (`background`, `tracks`, `overlay`) based on the following matrix:

| Element       | Ownship View                      | Opponent View (Normal) | Opponent View (Detected)                                                 |
| :---          | :---                              | :---                   | :---                                                                     |
| **Position**  | Always Visible                    | **HIDDEN**             | Possible Row/Col/Sector during SONAR_PING interrupt; Game over condition |
| **past_track**| Visible for CONN                  | **HIDDEN**             | **HIDDEN**                                                               |
| **mines**     | Visible: `co`, `sonar`            | **HIDDEN**             | **HIDDEN**                                                               |
| **terrain**   | Visible: reg/tactical scales only | Always Visible         | Always Visible                                                           |

> - **Breadcrumb Visibility**: Only visible to `co` and `connScene` - never visible to `sonar` operators (ownship or enemy)
> - **Sonar Precision**: `SONAR_PING` reveals a binary position data pairing (map highlighted) of the enemy submarine [row, column, sector] (enemy provides 2 via selection during `SONAR_PING` interrupt. One is TRUE, one is FALSE) 
  - **Sonar Persistence**: "Detected" (enemy returned) visuals persist on `sonar` and `co` map displays for 8 seconds (store duration in `mapConstants.js`) fading out after interrupt resolves.
  
## TODO / Priority Milestones

1.  **Universal Filtering System**
    - [ ] Implement `MapController.parseFilteredState(state)` to handle the identity and context logic.
    - [ ] Add `isOpponentVisible` flag to `MapViewArea` to toggle the opponent sprite.
    - [ ] Add `isPastTrackVisible` toggle for breadcrumb rendering.

2.  **Ownship Socket Integration**
    - **Trigger**: Listen for `stateUpdate` events from `socketManager`.
    - **Logic**: If the `row` or `col` of the identified ownship differs from the current position, call `mapView.setOwnShipPosition(row, col, true, isCentered)` for `co`/`connScene` only. See `Auto-Centering` below.
    - **Auto-Centering**: Active only for `co`/`connScene`: Implement an inactivity timer (e.g., 2 seconds) on `PAN` (map state) to auto-center on ownship. If the user hasn't panned manually, auto-center on ownship movement. All auto-center events will set map state to `ANIMATING` until completion.

3.  **Breadcrumb Rendering (past_track) [`co`/`connScene` only]**
    - **Data Source**: Use the `past_track` array from the server's submarine object.
    - **Implementation**: 
        - Use `Graphics` for connecting lines on the `tracks` layer.
        - Pool `Sprite` objects (aliased as `map_dot`) for nodes.
        - **Masking**: Implement `maskCurrentPosition` to hide the node directly under the submarine.

4.  **Map State & Interaction API**
    - **Purpose**: Allows parent scenes to request data from the map or trigger map-specific logic.
    - **Implementation**:
        - [ ] Implement `mapView.getSelectedTile()` to allow a parent scene to "grab" the current selection (e.g., for a Torpedo confirmation).
        - [ ] Add `mapView.requestCoordinateSelection(mode)` to allow a scene to programmatically force the map into a selection state.
        - [ ] Standardize `map:clicked` event payload to include `SquareData` (terrain type, sector, etc.) for easier scene-level logic.

5.  **Terrain & Obstacle Rendering (board) [LOW PRIORITY]**
    - **Data Source**: Use the 2D `board` array.
    - **Implementation**: Create `MapTerrain` to render `Graphics` or `TilingSprite` blocks on the `background` layer.
    - **Optimization**: Bake static terrain into a `RenderTexture` on zoom change.

6.  **Smooth Zoom & Scale [LOW PRIORITY]**
    - **Logic**: Implement `setZoom(scale)` using a Ticker to interpolate `config.tileSize`.
    - **Focus**: Maintain the grid-local point at the center of the viewport during scaling.
