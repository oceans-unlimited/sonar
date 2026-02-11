/**
 * Scene Manager — New primary scene manager.
 * Uses SCENE_MAP, CONTROLLER_MAP, and DECORATOR_MAP for clean separation.
 */

import * as PIXI from 'pixi.js';

// --- Scene Factories ---
import { createEngineScene } from '../scenes/engineerScene';
import { createTestScene } from '../scenes/testScene';
import { createXOScene } from '../scenes/xoScene';

// --- Controllers ---
import { EngineerController } from '../control/engineerController';
import { ColorTestController } from '../control/colorTestController';
import { XOController } from '../control/xoController';

// --- Decorators ---
import { decorateEngineerScene } from '../render/decorators/engineerDecorator';

// ─────────── Maps ───────────

const SCENE_MAP = {
    engineer: createEngineScene,
    test: createTestScene,
    xo: createXOScene,
};

const CONTROLLER_MAP = {
    engineer: EngineerController,
    test: ColorTestController,
    xo: XOController,
};

const DECORATOR_MAP = {
    engineer: decorateEngineerScene,
};

// ─────────── Scene Manager Class ───────────

export class SceneManager {
    constructor(app, assets, socketManager) {
        this.app = app;
        this.assets = assets;
        this.socketManager = socketManager;

        this.currentScene = null;
        this.currentController = null;
        this.currentSceneKey = null;
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
            if (typeof this.currentController.destroy === 'function') {
                this.currentController.destroy();
            }
            this.currentController = null;
        }

        // 3. Create the new scene view
        console.log(`[SceneManager] Building scene: ${sceneKey}`);
        const sceneView = await sceneFactory(this.app, this.assets, this.socketManager);

        // 4. Instantiate & bind the controller (if one is registered)
        const ControllerClass = CONTROLLER_MAP[sceneKey];
        let controller = null;
        if (ControllerClass) {
            controller = new ControllerClass(this.socketManager, this);
            controller.bindView(sceneView);
            console.log(`[SceneManager] Controller bound for: ${sceneKey}`);
        }

        // 5. Apply decorator (if one is registered)
        const decorator = DECORATOR_MAP[sceneKey];
        if (decorator) {
            decorator(sceneView, controller);
            console.log(`[SceneManager] Decorator applied for: ${sceneKey}`);
        }

        // 6. Add to stage
        this.app.stage.addChild(sceneView);
        this.currentScene = sceneView;
        this.currentController = controller;
        this.currentSceneKey = sceneKey;

        console.log(`[SceneManager] Scene "${sceneKey}" loaded. Stage children: ${this.app.stage.children.length}`);

        // 7. Trigger controller lifecycle hook
        if (controller && typeof controller.onViewBound === 'function') {
            controller.onViewBound(sceneView);
        }
    }

    /**
     * Get the list of available scene keys.
     * @returns {string[]}
     */
    getAvailableScenes() {
        return Object.keys(SCENE_MAP);
    }

    /**
     * Destroy the current scene and controller.
     */
    destroy() {
        if (this.currentScene) {
            this.app.stage.removeChild(this.currentScene);
            this.currentScene.destroy({ children: true });
            this.currentScene = null;
        }
        if (this.currentController) {
            if (typeof this.currentController.destroy === 'function') {
                this.currentController.destroy();
            }
            this.currentController = null;
        }
    }
}
