# Agent Guidelines for Captain Sonar Project

## Overview
This project is a digital adaptation of the board game Captain Sonar, implementing real-time networked submarine combat. It uses Node.js server with Socket.IO and Pixi.js client-side rendering.

## Build, Lint, and Test Commands

### Development Server
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
```

### Testing
```bash
npm test            # Run all tests with Vitest
npm run test:file   # Run specific test file (usage: npm run test:file path/to/test.js)
```

### Individual Test Execution
```bash
npx vitest run tst/submarine-state.test.js    # Run single test file
npx vitest run tst/submarine-state.test.js -t "should start in SUBMERGED state"  # Run specific test
```

### Linting and Formatting
No linting or formatting tools are currently configured. Consider adding ESLint and Prettier for code quality.

## Code Style Guidelines

### Language and Modules
- **ES6 Modules**: Use `import`/`export` syntax exclusively
- **File Extensions**: `.js` for both server and client code
- **Strict Mode**: Enabled by default in modules

### Naming Conventions
- **Variables/Functions**: camelCase (`calculateDistance`, `socketManager`)
- **Classes**: PascalCase (`MapController`, `SubmarineStateMachine`)
- **Constants**: UPPER_SNAKE_CASE (`GlobalPhases`, `InterruptTypes`)
- **Files**: kebab-case for multi-word (`submarine-state.test.js`)
- **Directories**: lowercase (`public/js/features/`)

### Code Structure
```javascript
// Import statements at top
import { createServer } from 'http';
import { LogicalServer } from './logical-server.lib.js';

// JSDoc comments for functions
/**
 * Creates and configures the HTTP server
 * @param {LogicalServer} logicalServer - The game logic server
 * @param {number} port - Port to listen on
 * @returns {http.Server}
 */
export function createAndRunServer(logicalServer, port) {
  // Function implementation
}

// Constants at module level
export const GlobalPhases = {
  LOBBY: 'LOBBY',
  GAME_BEGINNING: 'GAME_BEGINNING',
  INTERRUPT: 'INTERRUPT',
  LIVE: 'LIVE',
  GAME_OVER: 'GAME_OVER'
};
```

### Type Annotations
- Use JSDoc type annotations for parameters and return types
- Examples:
  ```javascript
  /**@type {LogicalServer} */ logicalServer
  /**@type {number} */ port
  /**@type {'N' | 'S' | 'E' | 'W'} */ direction
  ```

### Error Handling
- Use try/catch for synchronous errors
- Async errors handled with `.catch()` or try/catch in async functions
- Log errors with descriptive messages including context

### Asynchronous Code
- Prefer async/await over Promise chains
- Use Promise.all() for concurrent operations
- Handle rejections appropriately

### Socket.IO Communication
- Server events: `socket.on('event', handler)`
- Client emissions: `socket.emit('event', data)`
- State broadcasts: `ioServer.emit("state", logicalServer.state)`

## Testing Patterns

### Test Structure
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentName', () => {
  let instance;

  beforeEach(() => {
    instance = new ComponentName();
  });

  it('should perform expected behavior', () => {
    expect(instance.method()).toBe(expectedValue);
  });
});
```

### Mocking
```javascript
const mockFunction = vi.fn();
vi.spyOn(console, 'warn').mockImplementation(() => {});
```

### Fake Timers
```javascript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Advance time
vi.advanceTimersByTime(1000);
```

### Test Helpers
Use `tst/test-helpers.js` for common Socket.IO test utilities:
- `create8Clients()` - Create multiple test clients
- `waitForEvent()` - Wait for socket events
- `waitForState()` - Wait for state conditions

## Project Architecture

### Server Architecture
- **Entry Point**: `src/server.js`
- **Logic**: `src/logical-server.lib.js`
- **WebSocket Handling**: `src/server.lib.js`
- **Constants**: `src/constants.js`

### Client Architecture (New - src/)
- **Entry Point**: `src/main.jsx` (Vite-bundled)
- **Scenes**: `src/scenes/` - Component orchestration factories
- **Controllers**: `src/control/` - OOP-based state coordination (extending BaseController)
- **Render Layer**: `src/render/` - Class-based UI components (Button, Panel, etc.)
- **Behavior Layer**: `src/behavior/` - Interactable wiring and visual state coordinators
- **Core Services**: `src/core/` - Global singletons (SocketManager, SceneManager, UIStyle)
- **Features**: `src/feature/` - Long-lived persistent systems (Map, Interrupts)
- **Debug System**: `src/debug/` - Director Mode, scenarios, and overlays

### Existing (Deprecated) Client Style
- Files in `public/js/` follow a functional module pattern and are being phased out in favor of the class-based architecture in `src/`.
- Gradual migration: New scenes should be built in `src/`, legacy ones maintained in `public/js/` until refactored.

### Strict Separation of Concerns
**NEVER** mix responsibilities:
- Renderers: Only create Pixi visuals, no events/state
- Behaviors: Handle input/UI state, no game logic
- Controllers: Coordinate state, no direct rendering
- Scenes: Orchestrate lifecycle, no business logic

## Commit Message Style
Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code restructuring
- `test:` Testing changes
- `docs:` Documentation updates

## Security Considerations
- Validate all user inputs on server-side
- Use parameterized queries if database is added
- Avoid logging sensitive information
- Sanitize socket data before processing

## Performance Guidelines
- Minimize DOM manipulations in renderers
- Use object pooling for frequently created Pixi objects
- Batch socket emissions when possible
- Cache expensive calculations in controllers

## File Organization Rules

### Client-Side Structure (src/)
```
src/
├── main.jsx              # Application entry
├── core/                 # Global services
│   ├── socketManager.js
│   ├── sceneManager.js
│   └── uiStyle.js
├── feature/              # Persistent systems
│   ├── map/
│   └── interrupt/
├── control/              # OOP Controllers
├── scenes/               # Scene Factories
├── render/               # UI Components
│   └── effects/          # Visual effects
└── behavior/             # Interaction logic
```

### Server-Side Structure
```
src/
├── server.js              # Server entry
├── server.lib.js          # WebSocket handling
├── logical-server.lib.js  # Game logic
├── constants.js           # Shared constants
└── engineLayout.lib.js    # Game engine logic
```

## Integration with Agent Rules

## Project Documentation

See [PROJECT.md](PROJECT.md) for detailed development session summaries and implementation notes.

## Integration with Agent Rules

This project includes additional architectural guidelines in `.agent/rules/project-organizational-rules.md`. These rules provide detailed client-side architecture constraints and anti-patterns that must be followed.

Key principles:
- Controller-driven architecture with clear boundaries
- Separation of rendering, behavior, and control
- Features as persistent shared systems
- Strict prohibition of cross-concern logic mixing</content>
<parameter name="filePath">/home/seth/Documents/Coding/sonar/AGENTS.md