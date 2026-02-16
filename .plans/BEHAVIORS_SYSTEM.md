# Button Behaviors & Effects System

The Button system in **Sonar** follows a strict **Controller-Driven Composition** architecture. It separates the visual construction of a button from its mechanical logic and visual feedback, allowing for highly reusable components and a data-driven scene definition.

---

## 1. The Four Pillars Architecture

The system is organized into four distinct layers of responsibility, ensuring that visual changes never leak into business logic.

### I. Structure (The Scene Module)
Defined in `src/scenes/`, each scene is a JS module that constructs and exports a PixiJS Container. The scene module is responsible for:
- Creating the root container.
- Initializing the layout engine.
- Instantiating buttons via `Button.js` (Visuals) and `buttonBehavior.js` (Logic) helpers.
- defining the `id`, `profile`, `preset`, and `event` intent for each, often using a local configuration array or factory function.

### II. Render (Visual Assembly & Profiles)
- **`Button.js`**: A "dumb" renderer. It assembles PixiJS objects (Sprites, Graphics) based on a `PROFILE_CONFIG` registry.
- **`visuals.js`**: Contains stateless "manipulators" (e.g., `setScale`, `setAlpha`, `toggleOverlay`).
- **`interactiveProfiles.js`**: Maps logical states (IDLE, HOVER, etc.) to specific visual manipulations using the functions in `visuals.js`.

### III. Behavior (Mechanical Logic & Wiring)
- **`interactable.js`**: Manages raw pointer events to track `isHovered` and `isPressed`.
- **`buttonBehavior.js`**: Implements the state machine for the different **Presets**. It manages the `isActive` state for toggles and emits events.
- **`buttonStateCoordinator.js`**: The coordinator. It translates logical state changes into visual profile calls.

### IV. Control (State Coordination)
- **`SceneController.js`**: Listens for event intents. It has no knowledge of the button's color, profile, or the specific scene module that created it; it only reacts to the "Intent" (e.g., `DEACTIVATE_ALL`). It can reach back into the system to enable/disable buttons via the behavioral API.

---

## 2. Scene Module Structure

The scene module exports a `createScene` function. It organizes buttons into "blocks" which handle layout.

```javascript
/* src/scenes/engineerScene.js */
import { createLayout } from '../render/layouts.js';
import { createButton } from '../render/button.js';

export function createScene(app) {
    const container = new PIXI.Container();

    // Layout Definition
    const mainLayout = createLayout({
        flexDirection: 'column',
        gap: 30,
        children: [
            // Engine Group
            createButton({
                id: 'reactor_01',
                asset: 'reactor',
                profile: 'REACTOR',
                preset: 'TOGGLE',
                event: 'ENG_PWR'
            })
        ]
    });

    container.addChild(mainLayout);
    return container;
}
```

---

## 3. Behavioral Presets

Presets define how a button behaves mechanically:

| Preset | Behavior | Trigger |
| :--- | :--- | :--- |
| **ACTION** | Fires once per click. | `pointertap` |
| **TOGGLE** | Persists an `ACTIVE` state on click. | `pointertap` |
| **MOMENTARY** | `ACTIVE` while held, `IDLE` when released. | `pointerdown` / `pointerup` |

---

## 4. Visual Profiles

Profiles define the "look and feel" for different button types:

- **BASIC**: Frameless, scale-based feedback.
- **FRAME**: Standard frame (`button.svg`) with an overlay. Rapid flicker effect on release.
- **CIRCUIT**: Fixed grey frame/tag. Visual states:
    - **IDLE (Locked)**: Normal opacity, no tag, non-interactive.
    - **ACTIVE (Ready)**: Slightly larger scale, fully interactive.
    - **DISABLED (Done)**: Reduced opacity, visible 'X' tag.
- **REACTOR**: Specialized indicators. Visual states:
    - **IDLE (Locked)**: Normal opacity, no tag, non-interactive.
    - **ACTIVE (Ready)**: Slightly larger scale, fully interactive.
    - **DISABLED (Done)**: Reduced opacity, visible 'X' tag.
- **INFO**: High-transparency defaults with high-contrast hover.

**Note on Opacity:** The `setAlpha` manipulator targets the **Background Icon only**. Frames and Tags remain at 100% opacity to ensure structural visibility even when the button function is dimmed/disabled.

---

## 5. Architectural Compliance

This system strictly adheres to the project's **Separation of Concerns**:

1.  **Stateless Renderers**: `Button.js` has no internal state and no event listeners. It only exposes structural methods (`addOverlay`, etc.).
2.  **Logic-Only Behaviors**: `buttonBehavior.js` handles the "switch logic." It doesn't know what the button looks like.
3.  **Composition over Inheritance**: Interaction is added by "wiring" a renderer to a behavior (`wireButton`), rather than extending a base class.
4.  **Decoupled Control**: The `SceneController` receives event metadata (including `address` and `id`) allowing for complex system-wide logic (like a Master Kill Switch) without knowing PixiJS implementation details.
