// Scene creators
import { createEngineScene } from '../scenes/engineerScene.js';
import { createTestScene } from '../scenes/testScene.js';

// Controllers and Decorators
import { BaseController } from '../control/baseController.js';
import { EngineerController } from '../control/engineerController.js';
import { ColorTestController } from '../control/colorTestController.js';
import { decorateEngineerScene } from '../render/decorators/engineerDecorator.js';

// Services
import { socketManager } from './socketManager.js';

export const CONTROLLER_MAP = {
    'default': BaseController,
    'engineer': EngineerController,
    'test': ColorTestController,
};

export const DECORATOR_MAP = {
    'engineer': decorateEngineerScene,
};

// The new SCENE_MAP replaces the deprecated BLUEPRINT_MAP.
// It maps a scene key to a function that constructs the scene's view.
export const SCENE_MAP = {
    'engineer': createEngineScene,
    'test': createTestScene,
    // Future scenes like 'captain' would be added here.
};

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
        await this.loadScene('engineer');
    }

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
        const sceneContent = sceneFactory(this.currentController, this.app.ticker);

        if (!sceneContent) {
            console.error(`[SceneManager] Scene factory for "${sceneKey}" returned nothing.`);
            return;
        }

        // 4.1 Link the view back to the controller
        this.currentController.bindView(sceneContent);

        // 5. Apply Scene Decoration (Custom Visuals)
        const decorator = DECORATOR_MAP[sceneKey];
        if (decorator) {
            console.log(`[SceneManager] Applying decorator for: ${sceneKey}`);
            decorator(sceneContent, this.currentController);
        }

        this.currentScene = sceneContent;
        this.app.stage.addChild(this.currentScene);
    }

    destroy() {
        if (this.currentScene) this.currentScene.destroy({ children: true });
        if (this.currentController) this.currentController.destroy();
    }
}
