# Interrupt Feature

The Interrupt feature is the central coordinator for all game-halting events. It owns the simulation clock lifecycle and provides a role-aware context swap system for displaying interrupt-specific UI to each player.

## Core Responsibilities

1. **Clock Control**: `InterruptManager` is the **only** system allowed to call `simulationClock.stop()` / `start()`. All clock-halting actions must route through it.
2. **Interrupt Lifecycle**: Manages the start → update → resolve → end cycle for global interrupts.
3. **Phase Coordination**: Transitions `gamePhaseManager` between `LIVE` and `INTERRUPT` phases.
4. **Context Swap**: The `InterruptCoordinator` swaps the control panel's normal content for role-aware interrupt panels.

## Architecture

```
interrupt/
├── InterruptManager.js         // State owner: interrupt lifecycle + clock control
├── InterruptController.js      // Controller: API for requesting/resolving interrupts
├── InterruptCoordinator.js     // Coordinator: non-visual context swapper, wires behaviors
├── interruptPanelRenderer.js   // Renderer: stateless panel builders per [type, role]
├── InterruptTypes.js           // Constants: canonical interrupt type enum
├── InterruptOverlay.js         // DEPRECATED — replaced by InterruptCoordinator
└── README.md
```

### Data Flow

Interrupts are **exclusively server-driven**. The `InterruptController` never calls `interruptManager` directly.

```
── Requesting an Interrupt (client → server) ──
Scene Controller → interruptController.requestPause()
    → socket.emit('request_pause') → Server validates → Server broadcasts state

── Interrupt Activation (server → client) ──
Server broadcasts state with { activeInterrupt: { type, payload } }
    → socketManager → SceneManager._setupStateSync()
    → interruptManager.requestInterrupt(type, payload)
        → simulationClock.stop()
        → gamePhaseManager.setPhase(INTERRUPT)
        → InterruptCoordinator.show(interrupt)
            → Hide normalContent in swapWrapper
            → interruptPanelRenderer.buildPanel(interrupt, role) → Container
            → wireButton() on interactive nodes
            → Add interrupt panel to swapWrapper

── Resolving an Interrupt (client → server → client) ──
Player clicks READY → interruptController.readyInterrupt()
    → socket.emit('ready_interrupt') → Server collects
    → Server removes activeInterrupt, broadcasts state
    → _setupStateSync() → interruptManager.resolveInterrupt()
    → InterruptCoordinator.hide()
        → Remove interrupt panel from swapWrapper
        → Show normalContent

── Semantic Tracking (Teletype) ──
Independent of the visual lifecycle above, the global `TeletypeController` watches `state.activeInterrupt` as well. When a new interrupt starts, it automatically queries the `TeletypeTranslator` to push role-specific semantic flavor text to the local player's terminal.
```

### Component Roles

| File | Role | Rules |
|:---|:---|:---|
| `InterruptManager.js` | **State** | Owns `_activeInterrupt`. Only system that touches the clock. Emits lifecycle events. |
| `InterruptController.js` | **Controller** | Server-driven. Emits socket events only (`request_pause`, `ready_interrupt`, `submit_sonar_response`). Never calls `interruptManager` directly. |
| `InterruptCoordinator.js` | **Coordinator** | Non-visual lifecycle coordinator. Subscribes to manager events. Swaps normalContent for interrupt panels in the swapWrapper. Wires behaviors on rendered content. |
| `interruptPanelRenderer.js` | **Renderer** | Pure stateless functions. Returns PixiJS containers with labelled children. No events, no state. |
| `InterruptTypes.js` | **Constants** | Canonical enum for interrupt type strings. |

## Usage

### Mounting in a Scene

Scenes create the coordinator (non-visual — **not added to display list**) and bind it to the scene:

```js
import { InterruptCoordinator } from '../feature/interrupt/InterruptCoordinator.js';

// In scene factory:
const interruptCoordinator = new InterruptCoordinator(ticker, 'co'); // role hint
interruptCoordinator.bindView(sceneContent); // discovers swapWrapper by label

// Register for cleanup
sceneContent.on('destroyed', () => {
    interruptCoordinator.destroy();
});
```

The coordinator automatically subscribes to `interruptManager` events. It finds the `swapWrapper` and `normalContent` by standardized labels in the scene graph. No additional wiring is needed — `SceneManager` handles server state sync.

### Control Panel Layout (Standardized)

All role scenes follow this control panel structure:
```
[Control Panel]
  ├── [Damage UI] (label: 'damageContainer' — Persistent)
  ├── [Swap Wrapper] (label: 'swapWrapper')
  │     ├── [Normal Content] (label: 'normalContent' — hidden during interrupt)
  │     └── [Interrupt Content] (label: 'interruptContent' — added dynamically)
  └── [Teletype Box] (label: 'teletypeContainer' — Persistent)
```

### Requesting an Interrupt (from a Controller)

Controllers express **intent** via socket events. They never trigger `interruptManager` directly.

```js
// Via the injected feature:
this.features.get('interrupt').requestPause();         // → socket.emit('request_pause')
this.features.get('interrupt').readyInterrupt();        // → socket.emit('ready_interrupt')
this.features.get('interrupt').submitSonarResponse({}); // → socket.emit('submit_sonar_response')
```

The server validates, updates state, broadcasts `activeInterrupt`, and `SceneManager._setupStateSync()` activates the interrupt client-side.

### Role-Specific Panel Resolution

`interruptPanelRenderer.buildPanel(interrupt, role)` resolves content using a lookup:

1. `type:role` key (e.g., `SONAR_PING:co`) → role-specific panel
2. `type` key (e.g., `SONAR_PING`) → type default panel
3. Fallback → generic boilerplate

Example: `SONAR_PING` with role `co` renders a Captain response form; all other roles see a "waiting" message with a READY button.

## Interrupt Types

| Type | Trigger | Manual Ready? |
|:---|:---|:---|
| `PAUSE` | Captain requests | Yes |
| `WEAPON_RESOLUTION` | Torpedo/mine impact | Yes |
| `SONAR_PING` | Active sonar fired | Yes (crew), Submit (Captain) |
| `START_POSITIONS` | Game beginning | Captain selects tile + Ready (toggle) |
| `PLAYER_DISCONNECT` | Player drops connection | Yes |
| `SCENARIO_ACTION` | Scenario-specific event | No |

### Shared UI Components

- **Ready Button**: Universal across interrupt types. Uses `thumb` asset with toggle behavior (`setActive()`). Wired by `InterruptCoordinator._wireInteractiveNodes()`.
- **Status Label**: Modular text node (`interrupt_status_label`) updatable via `InterruptCoordinator.refresh()`. Used for position display, sonar responses, etc.

> **Note**: A "Validate Moves" process must immediately follow the selection of a starting position. This ensures legal moves are available and highlighted for the Captain as soon as the game enters the LIVE phase.

> **Server TODO**: The current server auto-resolves `START_POSITIONS` when all subs have chosen positions (`chooseInitialPosition`). The planned two-step flow (select → ready toggle) requires the server to wait for `ready_interrupt` from both captains before resuming. Director scenarios currently simulate this desired behavior.

## Key Rules

- **Interrupts are server-driven**: `InterruptController` emits socket events only. It never calls `interruptManager.requestInterrupt()` directly. All interrupt state changes flow through `SceneManager._setupStateSync()`.
- **Clock control is exclusive**: No other feature or controller may call `simulationClock.stop()` or `start()`.
- **Renderer is stateless**: `interruptPanelRenderer.js` must never attach events, manage state, or call the server.
- **Coordinator wires behaviors**: Button interactions are wired in `InterruptCoordinator.js` after the renderer returns the container.
- **Server sync lives in SceneManager**: `SceneManager._setupStateSync()` bridges `state.activeInterrupt` to `interruptManager`. Scenes do not handle this.
- **Context swap, not overlay**: The coordinator hides `normalContent` and adds interrupt panels to `swapWrapper`. No `position: absolute` or `zIndex` layering.
