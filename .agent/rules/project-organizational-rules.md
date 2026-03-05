---
trigger: always_on
---

# Client-Side Architecture & File Organization Rules (Features Included)

**Scope:** `/public/js`  
**Goal:** Strict separation of concerns for scalable, maintainable code.  
**Core Principle:** Controller-driven architecture with clear boundaries.

## 1. Responsibility Boundaries

| Concern       | Primary Role                              | Allowed Actions / Side Effects                  |
|---------------|-------------------------------------------|------------------------------------------------|
| Rendering     | Create Pixi visuals                       | Pixi object creation only                      |
| UI Behaviors  | Handle input & UI interaction state       | Pointer events, enable/disable, hover/active   |
| Effects       | Visual polish only                        | Tweens, filters, shaders, animations           |
| Controllers   | Coordinate state & game logic             | Call behaviors, query systems, route events    |
| Scenes        | Lifecycle & visual orchestration          | Create/destroy controllers, mount features     |
| Features      | Long-lived shared systems                 | Own state, renderer, controller, behaviors     |
| Core          | Global services                           | No scene-specific Pixi logic                   |

**Key Notes:**  
- Features are persistent; scenes mount/overlay them.  
- Scenes never duplicate feature logic.

## 2. Folder Responsibilities

### `/js/renderers/`  
Stateless visual construction.  
- Return Pixi objects or view structures.  
- **Never:** attach events, manage state, call server.

### `/js/core/`  
App-wide services.  
Allowed: socketManager, sceneManager, audioManager, uiStyle.  
**Never:** direct Pixi scene manipulation.

### `/js/core/uiEffects.js`  
Pure visual effects.  
Allowed: `applyGlow()`, `pulse()`, `shake()`.  
**Never:** events, enable/disable, business logic.

### `/js/ui/behaviors/`  
Reusable UI interaction logic.  
- Attach pointer events.  
- Manage mechanical state (enabled, hover, active).  
- Expose control API.  
- **Never:** game decisions, server calls, direct animation.

### `/js/features/<feature>/`  
Persistent systems (e.g., map, interrupts, submarine).  
Example structure:
features/
└─ interrupts/
    ├─ InterruptManager.js      // owns interrupt lifecycle
    ├─ InterruptController.js   // API for requesting interrupts
    ├─ InterruptTypes.js
    └─ InterruptTimers.js

**Rules:**  
- Maintain own state.  
- May call core services **only** in sanctioned cases (e.g., InterruptManager → simulationClock).  
- All other features/controllers **must** route through InterruptManager for clock control.

### `/js/controllers/`  
State coordination & decision-making.  
- React to server messages.
- Rx/Tx events.  
- Enable/disable UI via behaviors.  
- **Never:** create Pixi, wire events, animate directly.

### `/js/scenes/`  
Lifecycle owners.  
- Mount features, controllers, behaviors.  
- **Never:** reusable logic, server calls, game decisions.

## 3. Button & Control Rules

All button logic lives in `/ui/behaviors/`.  
**Disallowed:** uiEffects, scenes, controllers.  
**Pattern:**
    ```js
    const btn = attachButtonBehavior(sprite, config);
    btn.setEnabled(true);
    btn.destroy();
    ```
## 4. Server ↔ Client Flow
Server → socketManager → Controller → UI Behaviors → Renderer
**Rules:**

Server messages never directly modify visuals or attach events.
Controllers translate server state into UI intent.

## 5. Special Case: InterruptManager
**Exception:**

InterruptManager is the only system allowed to call simulationClock.stop()/start().
All clock-halting actions (pause, torpedo resolution, etc.) must route through InterruptManager.
No other feature or controller may touch the clock directly.

## 6. Anti-Patterns (Hard Fails)

Button logic in uiEffects, scenes, controllers
Pointer events in renderers
Pixi creation in controllers
Server/game logic in scenes
State flags on Pixi sprites
Direct clock control outside InterruptManager

## 7. Canonical Summary

Renderers → draw
Behaviors → interact (mechanical)
Effects → animate (visual)
Controllers → decide & route
Scenes → orchestrate lifecycle
Features → persist + share
Core → global coordination

Scenes attach mechanical behaviors to interactive display objects
Controllers attach intent-bearing behaviors