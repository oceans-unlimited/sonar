import { SceneManager } from "../core/sceneManager.js";

/**
 * Title Controller
 * Handles user interactions for the Title Scene.
 */
export class TitleController {
    constructor(app, renderer) {
        this.app = app;
        this.renderer = renderer;
    }

    init() {
        console.log("[TitleController] Initialized.");
    }

    destroy() {
        // Cleanup if needed
    }

    handleStart() {
        console.log("[TitleController] Starting Game (Transitioning to Lobby)...");
        SceneManager.changeScene('lobby');
    }

    handleSettings() {
        console.log("[TitleController] Opening Settings (Not implemented)...");
        // Future: SceneManager.changeScene('settings');
    }
}
