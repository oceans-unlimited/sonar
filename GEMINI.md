# Gemini Context: Laboratory

## Project Overview
**Laboratory** is a web-based experimentation sandbox built with **Vite** and **PixiJS (v8)**. It is designed to test and demonstrate rendering techniques, UI layouts, and interactive behaviors within a 2D Canvas/WebGL environment.

## 🚨 MANDATORY ARCHITECTURAL RULES 🚨
*Reference: [.agent/rules/project-organizational-rules.md](.agent/rules/project-organizational-rules.md)*

### 1. Responsibility Boundaries
- **Renderers**: Stateless Pixi object creation only. NO events, NO state, NO server calls.
- **Behaviors**: Input & mechanical UI state (enabled, hover, active). NO game logic, NO server calls.
- **Effects**: Visual polish only (filters, animations). NO logic, NO events.
- **Controllers**: State coordination & game logic. Rx/Tx events, call behaviors. NO Pixi creation, NO direct animation.
- **Scenes**: Lifecycle & orchestration. Mount features/controllers. NO reusable logic, NO server calls.
- **Features**: Persistent shared systems. Own state, renderer, controller, behaviors.
- **Core**: Global services. NO scene-specific Pixi logic.

### 2. Implementation Rules & Patterns
- **Server Flow**: Server → `socketManager` → Controller → UI Behaviors → Renderer.
- **Button Logic**: Must live in behaviors. Never in effects, scenes, or controllers.
- **Clock Control**: `InterruptManager` is the **ONLY** system allowed to call `simulationClock.stop()` or `start()`. All halts must route through it.
- **Composition over Inheritance**: Interaction is added by "wiring" a renderer to a behavior.

### 3. Anti-Patterns (Hard Fails)
- Button logic in effects, scenes, or controllers.
- Pointer events in renderers.
- Pixi creation in controllers.
- Server/game logic in scenes.
- State flags on Pixi sprites.
- Direct clock control outside `InterruptManager`.

## 🧪 TESTING RULES 🧪
*Reference: [.agent/rules/testing-rules.md](.agent/rules/testing-rules.md)*
- **Manual Verification**: User will run all browser-based tests manually.
- **Scenario Driven**: For every scene/feature, build an appropriate test scene and correlated **Director Mode** scenario.
- **Pristine State**: Scenarios must include a 'pristine' state for basic layout/rendering verification.
- **Functional Blocks**: Follow-on scenarios must focus on major functional milestones.
- **Role Specs**: Reference role-specific logic in `captain.md`, `engineer.md`, and `xo.md` within `.plans/`.

## Planning & Reference
Detailed architectural plans and role specifications are maintained in the [`.plans/`](./.plans/) directory:

### Core Systems & Architecture
- [**Controller Architecture**](./.plans/CONTROLLER_ARCHITECTURE.md): Polymorphic Action Mapping and Routing.
- [**Behaviors System**](./.plans/BEHAVIORS_SYSTEM.md): The "Four Pillars" Button & Interaction architecture.
- [**Color Control**](./.plans/COLOR_CONTROL_PLAN.md): Unified interface for cascading color updates.
- [**PixiJS Layout**](./.plans/pixi-layout.md): Comprehensive guide to flexbox-like positioning.

### Role Specifications
- [**Captain**](./.plans/captain.md): Logic for navigation and vessel state.
- [**Engineer**](./.plans/engineer.md): Logic for reactor maintenance and circuit management.
- [**First Officer (XO)**](./.plans/xo.md): Logic for subsystem charging and activation.

### Testing & Debug (Director Mode)
- [**Test Harness Architecture**](./.plans/TEST_HARNESS_ARCHITECTURE.md): Design for the client-side mock server.
- [**Director Mode Implementation**](./.plans/DIRECTOR_MODE_IMPLEMENTATION.md): Current status and technical integration of the Director.

### Roadmap & Problem Solving
- [**Next Steps**](./.plans/next_steps.md): Implementation milestones and tracking.
- [**Dynamic Layout Gaps**](./.plans/dynamic_layout_gaps.md): Strategy for server-driven UI skins.
- [**LLM Context**](./.plans/llms-medium.md): Consolidated PixiJS v8 documentation for development assistance.

## Build & Run
- **Install**: `npm install`
- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`

## Architecture Summary
### Key Patterns
1.  **Separation of Concerns**: Control (What), Render (How it looks), Behavior (How it interacts).
2.  **Modular Scenes**: Self-contained modules in `src/scenes/` exported as containers.
3.  **Layout Engine**: Heavy reliance on `@pixi/layout` for flexbox-like positioning.
4.  **Socket Injection**: Standardized `socketManager` handles real or mock (`Director`) connections.
