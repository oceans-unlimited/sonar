# Event Logging & Debugging Rules

**Scope:** Application-wide (Client & Server)
**Goal:** Full visibility of the event flow (Socket, UI, and Controller) via the on-screen debug overlay.

## 1. Mandatory Debug Logging
All "Intents" (user-driven actions) and "State Changes" (server-driven updates) MUST be logged to the `debug-log` overlay.
- Visual: `window.logEvent(message)`
- Console: `console.log(message)`

## 2. Implementation Patterns

### Controller Intents
ALL user interactions (buttons, text edits, role selections) MUST route through `BaseController.handleEvent`.
- **Requirement**: Payloads must include a unique `id` for logging.
- **Client-Side Events**: If an event is client-side only (no socket emission/logic), the payload MUST include `isClientOnly: true`. 
- **Example**: `controller.handleEvent('TOGGLE_UI_PANEL', { isClientOnly: true, id: 'btn_toggle_sonar' })`

### Socket Communication
All non-state socket events (renames, ready toggles, role selections) should be logged upon emission and reception.
- **Pattern**: If using a custom socket wrapper, ensure `emit` calls are logged.

### State Updates
Important game state transitions (e.g., game starting, round over) should be logged to the overlay to provide clear milestones during testing.

## 3. The Debug Overlay (`index.html`)
The `#debug-log` in `index.html` is the authoritative source for event verification in **Director Mode**.
- Log entries must be concise (e.g., `> [Controller] Routing: SELECT_ROLE | ID: btn_role_A_co`).
- Entries automatically expire after 4 seconds to prevent screen clutter.

## 4. Anti-Patterns (Hard Fails)
- Direct socket emissions from scene renderers or behaviors.
- Silent controller handlers (no logging via `handleEvent`).
- UI interactions that don't trigger a visual log entry.
