# Teletype Feature

The Teletype feature is a highly resilient, visually immersive text logging system designed for both mechanical UI feedback and localized semantic game narrative. 

## Architectural Philosophy
The Teletype subsystem operates under a strict **Semantic Translation** rule:
**Rule:** The Server should *never* send flavor text across the wire. 

Instead, the Teletype has permission to ingest broad, semantic structures (like interrupts, connection events, or subsystem states) and dynamically translate them into localized flavor text relative to the specific view context (`role`, `vessel`, etc.).

```
feature/teletype/
├── TeletypeManager.js         // Singleton: Owns the Pixi UI (TerminalBox)
├── teletypeController.js      // Controller: Evaluates game states, applies logic + translations
├── teletypeTranslator.js      // Resource: A structured dictionary mapping states to text
└── components/
    ├── terminalBox.js         // Visual component
    └── terminalLine.js        // Visual component
```

## Integrating into Scenes
Generally, scenes instantiate the visual elements via `teletypeManager.mount(container, opts)` and then pass the `teletypeManager` instance down into the controller hierarchy via `BaseController.features.set('teletype', teletypeManager)`.

## Dual-Source Architecture

The Teletype aggregates logs from two distinct sources without muddling them together:

### 1. Local UI Feedback (Mechanical API)
For standard click interactions, feedback (e.g., "Silence uncharged"), or local warnings (e.g. "Awaiting Engineer"), Role Controllers have access to an abstracted method directly on `BaseController`.

```javascript
// In connController.js
if (!sub.canFire('silence')) {
    this.pushTeletype('> [Error] Silence uncharged.', { color: Colors.caution });
}
```
This skips the server completely, functioning instantly as local UI validation.

### 2. Semantic Event Auto-Logging (Server-Driven API)
`TeletypeController` extends `BaseController` and naturally receives `onGameStateUpdate` whenever the server pushes state.

Instead of writing complex conditional blocks inside role controllers for global events (like Interrupts starting), `teletypeController` natively diffs states:
- It isolates semantic triggers (e.g., watching `activeInterrupt.type`).
- It extracts the client's current context (`role`, `vessel`).
- It delegates to `teletypeTranslator.js` to look up the correct semantic phrase.

## The TeletypeTranslator
`teletypeTranslator.js` functions as an isolated dictionary struct. This makes it incredibly easy to add new narrative interactions without polluting code logic, and structurally primes the application for an eventual database backend.

```javascript
// Example lookup dictionary inside teletypeTranslator.js
'INTERRUPT_START_POSITIONS': {
    resolver: (context) => {
        if (context.role === 'co') return { text: '...', color: Colors.primary };
        return { text: '...', color: Colors.secondary };
    }
}
```
