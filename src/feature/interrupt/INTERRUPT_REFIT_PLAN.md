# Interrupt Refit: Context Swap Architecture (Completed)

## Status: IMPLEMENTED

The original "overlay" concept has been replaced by a **context swap** pattern using the `InterruptCoordinator`.

## Architecture

### InterruptCoordinator (replaces InterruptOverlay)
- **Non-visual coordinator** — plain class, not a PixiJS displayObject
- Subscribes to `interruptManager` events
- Discovers `swapWrapper` and `normalContent` by standardized labels via `bindView(sceneContent)`
- On interrupt: hides `normalContent`, builds role-specific panel, adds it to `swapWrapper`
- On end: removes panel, restores `normalContent`

### Standardized Control Panel Layout
All role scenes follow this layout within their control panel:
```
[Control Panel]
  ├── [Damage UI] (Persistent)
  ├── [Swap Wrapper]  (label: 'swapWrapper')
  │     ├── [Normal Content] (label: 'normalContent' — hidden during interrupt)
  │     └── [Interrupt Content] (added/removed dynamically)
  └── [Teletype Box] (Persistent)
```

### Shared Components
- **Ready Button**: Universal `thumb` asset button with toggle behavior
- **Status Label**: Modular `interrupt_status_label` text node, updatable via `refresh()`

### Files Changed
- **[NEW]** `InterruptCoordinator.js` — non-visual context swap coordinator
- **[UPDATED]** `interruptPanelRenderer.js` — thumb button, status label, updated panels
- **[UPDATED]** All role scenes (conn, xo, engineer, sonar) — use coordinator instead of overlay
- **[DEPRECATED]** `InterruptOverlay.js` — replaced by InterruptCoordinator

See [README.md](./README.md) for full documentation.
