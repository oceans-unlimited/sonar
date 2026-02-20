/**
 * Scene Manager — New primary scene manager.
 * Uses SCENE_MAP, CONTROLLER_MAP, and DECORATOR_MAP for clean separation.
 */

// --- Scene Factories ---
import { createEngineScene } from '../scenes/engineerScene';
import { createTestScene } from '../scenes/testScene';
import { createXOScene } from '../scenes/xoScene';
import { createMapTestScene } from '../scenes/mapTestScene';

// --- Controllers ---
import { BaseController } from '../control/baseController';
import { EngineerController } from '../control/engineerController';
import { ColorTestController } from '../control/colorTestController';
import { XOController } from '../control/xoController';

// Services
import { socketManager } from './socketManager.js';

// ─────────── Maps ───────────

export const CONTROLLER_MAP = {
    'default': BaseController,
    'engineer': EngineerController,
    'test': ColorTestController,
    'xo': XOController,
};

export const SCENE_MAP = {
    'engineer': createEngineScene,
    'test': createTestScene,
    'xo': createXOScene,
    'mapTest': createMapTestScene,
};

// ─────────── Scene Manager Class ───────────

export class SceneManager {
    constructor(app) {
        this.app = app;
        this.currentScene = null;
        this.currentController = null;

        // Placeholder for future feature registry
        this.features = {};
    }

    async init() {
        // Load the default scene by its key on startup.
        await this.loadScene('test');
    }

    /**
     * Load a scene by key.
     * Handles full lifecycle: destroy old → build new → decorate → bind controller.
     * @param {string} sceneKey
     */
    async loadScene(sceneKey) {
        // 1. Get the Scene Factory from the map
        const sceneFactory = SCENE_MAP[sceneKey];
        if (!sceneFactory) {
            console.error(`[SceneManager] Scene factory not found for key: ${sceneKey}`);
            return;
        }

        // 2. Robust Memory Management: Destroy existing scene and controller
        if (this.currentScene) {
            console.log('[SceneManager] Destroying old scene visuals...');
            this.app.stage.removeChild(this.currentScene);
            this.currentScene.destroy({ children: true, texture: false, baseTexture: false });
            this.currentScene = null;
        }

        if (this.currentController) {
            console.log('[SceneManager] Destroying old controller...');
            this.currentController.destroy();
            this.currentController = null;
        }

        // 3. Create the Controller (Logic) using the Factory Pattern
        const ControllerClass = CONTROLLER_MAP[sceneKey] || CONTROLLER_MAP.default;
        if (!ControllerClass) {
            console.error(`[SceneManager] Controller not found for key: ${sceneKey}`);
            return;
        }
        console.log(`[SceneManager] Instantiating controller for: ${sceneKey}`);
        this.currentController = new ControllerClass();

        // 3.1. Inject Dependencies (Socket & Features)
        // We inject the socketManager singleton as the "socket" provider
        // This decouples the controller from the specific import
        this.currentController.bindSocket(socketManager);

        if (this.features) {
            this.currentController.bindFeatures(this.features);
        }

        // 3.2. Wire Scene Change Callback
        this.currentController.onSceneChange = (newSceneKey) => {
            if (SCENE_MAP[newSceneKey]) {
                this.loadScene(newSceneKey);
            } else {
                console.error(`[SceneManager] Scene not found: ${newSceneKey}`);
            }
        };

        // 4. Create the View (Visuals) by calling the scene's factory function
        const sceneContent = await sceneFactory(this.currentController, this.app.ticker);

        if (!sceneContent) {
            console.error(`[SceneManager] Scene factory for "${sceneKey}" returned nothing.`);
            return;
        }

        // 4.1 Link the view back to the controller
        this.currentController.bindView(sceneContent);

        // 5. Add to stage
        this.currentScene = sceneContent;
        this.app.stage.addChild(this.currentScene);
    }

    /**
     * Destroy the current scene and controller.
     */
    destroy() {
        if (this.currentScene) this.currentScene.destroy({ children: true });
        if (this.currentController) this.currentController.destroy();
    }

    /**
     * Get available scene keys.
     * @returns {string[]}
     */
    getAvailableScenes() {
        return Object.keys(SCENE_MAP);
    }
}
