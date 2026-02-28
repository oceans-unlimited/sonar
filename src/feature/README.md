# Feature Directory

This directory contains long-lived, persistent systems that are shared across scenes.

## Structure

Each feature should have its own subdirectory:

```
feature/
├── interrupt/
│   ├── InterruptManager.js
│   ├── InterruptController.js
│   ├── InterruptTypes.js
│   └── InterruptTimers.js
├── map/
│   ├── MapManager.js
│   ├── MapController.js
│   └── MapRenderer.js
└── submarine/
    ├── SubmarineState.js
    └── SubmarineController.js
```

## Rules

- **Maintain own state** - Features are stateful and persistent
- **May call core services** only in sanctioned cases
- **All other features/controllers must route through feature APIs**

## When to Create a Feature

Create a feature when you have a system that:
- ✅ Persists across scene changes
- ✅ Is shared by multiple scenes
- ✅ Has its own state and lifecycle
- ✅ Provides an API for other systems

## When NOT to Create a Feature

Don't create a feature for:
- ❌ Scene-specific logic (belongs in `/scenes/`)
- ❌ Stateless utilities (belongs in `/render/util/` or `/behavior/`)
- ❌ One-off components (belongs in `/render/`)
