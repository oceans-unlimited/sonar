# Redundant Files (Investigation List)

The following files in `public/js/` have been superseded or merged into the new `src/` architecture. These are candidates for removal once the migration is verified.

| Old File Path (public/js/) | New Replacement / Merged Into | Status |
|:--- |:--- |:--- |
| `client.js` | `src/main.jsx` | Superceded (Vite Entry) |
| `core/sceneManager.js` | `src/core/sceneManager.js` | Superceded (Primary Service) |
| `core/socketManager.js` | `src/core/socketManager.js` | Superceded (Primary Service) |
| `core/uiStyle.js` | `src/core/uiStyle.js` | Merged (Styling Tokens) |
| `renderers/buttonRenderer.js` | `src/render/button.js` | Superceded (Class-based) |
| `renderers/panelRenderer.js` | `src/render/panel.js` | Superceded (Class-based) |
| `renderers/engineRenderer.js` | `src/scenes/engineerScene.js` | Subsumed (Scene Factory) |
| `controllers/engineController.js` | `src/control/engineerController.js` | Refactored (OOP) |
| `renderers/xoRenderer.js` | `src/render/subsystemRow.js` | Subsumed (Component Class) |
| `scenes/xoScene.js` | `src/scenes/xoScene.js` | Refactored (Source Moved) |
| `controllers/xoController.js` | `src/control/xoController.js` | Refactored (OOP) |
| `ui/behaviors/buttonStateManager.js` | `src/behavior/buttonBehavior.js` | Superceded (System Hooks) |
| `ui/effects/glowEffect.js` | `src/render/effects/animators.js` | Superceded (Filter Effects) |
| `mockEngineLayout.js` | `src/debug/scenarios/shared/engineMockData.js` | Superceded (Scenario Mock) |

## Notes
- `public/js/features/` and other controllers/scenes still exist for backwards compatibility during Phase 2 migration.
- `public/index.html` is technically redundant as Vite uses the root `/index.html`.
