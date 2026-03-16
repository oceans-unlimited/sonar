/**
 * Scene Manager — New primary scene manager.
 * Uses SCENE_MAP, CONTROLLER_MAP, and DECORATOR_MAP for clean separation.
 */

// --- Scene Factories ---
import { createEngineScene } from '../scenes/engineerScene';
import { createTestScene } from '../scenes/testScene';
import { createXOScene } from '../scenes/xoScene';
import { createMapTestScene } from '../scenes/mapTestScene';
import { createTeletypeScene } from '../feature/teletype/teletypeScene.js';
import { createConnScene } from '../scenes/connScene';
import { createSubmarineTestScene } from '../scenes/submarineTestScene';
import { createDamageTestScene } from '../scenes/damageTestScene';
import { createSurfaceTestScene } from '../scenes/surfaceTestScene';

// --- Controllers ---
import { BaseController } from '../control/baseController';
import { EngineerController } from '../control/engineerController';
import { ColorTestController } from '../control/colorTestController';
import { XOController } from '../control/xoController';
import { MapController } from '../feature/map/mapController';
import { TeletypeController } from '../feature/teletype/teletypeController.js';
import { ConnController } from '../control/connController';
import { SubmarineController } from '../feature/submarine/SubmarineController';
import { DamageController } from '../feature/damage/DamageController';
import { SurfaceController } from '../feature/surface/SurfaceController';
import { SubmarineTestController } from '../control/SubmarineTestController';

// Services
import { socketManager } from './socketManager.js';
import { interruptManager } from '../feature/interrupt/InterruptManager.js';
import { gamePhaseManager, GamePhases } from './clock/gamePhaseManager.js';

// Features (Persistent Services)
import { submarine } from '../feature/submarine/submarine';
import { interruptController } from '../feature/interrupt/InterruptController';
import { mapManager } from '../feature/map/mapManager';

// ─────────── Maps ───────────

export const CONTROLLER_MAP = {
    'default': BaseController,
    'engineer': EngineerController,
    'test': ColorTestController,
    'xo': XOController,
    'mapTest': ConnController,
    'teletype': TeletypeController,
    'conn': ConnController,
    'submarineTest': SubmarineTestController,
    'damageTest': DamageController,
    'surfaceTest': SurfaceController,
};

export const SCENE_MAP = {
    'engineer': createEngineScene,
    'test': createTestScene,
    'xo': createXOScene,
    'mapTest': createMapTestScene,
    'teletype': createTeletypeScene,
    'conn': createConnScene,
    'submarineTest': createSubmarineTestScene,
    'damageTest': createDamageTestScene,
    'surfaceTest': createSurfaceTestScene,
};

// ─────────── Scene Manager Class ───────────

export class SceneManager {
    constructor(app) {
        this.app = app;
        this.currentScene = null;
        this.currentController = null;

        // Persistent Feature Registry
        // These live for the duration of the application lifecycle.
        this.features = {
            submarine: new SubmarineController(),
            interrupt: interruptController
        };

        // Bind persistent features to the transport layer
        Object.values(this.features).forEach(f => f.bindSocket(socketManager));

        this._setupStateSync();
    }

    _setupStateSync() {
        socketManager.on('stateUpdate', (state) => {
            if (state.phase) {
                gamePhaseManager.setPhase(GamePhases[state.phase] || state.phase);
            }

            // Sync active interrupt
            const serverInterrupt = state.activeInterrupt;
            const clientInterrupt = interruptManager.getActiveInterrupt();

            if (serverInterrupt && !clientInterrupt) {
                // Server has interrupt, client doesn't - Start it
                interruptManager.requestInterrupt(serverInterrupt.type, serverInterrupt.data || serverInterrupt.payload);
            } else if (!serverInterrupt && clientInterrupt) {
                // Server has no interrupt, client does - Resolve it
                interruptManager.resolveInterrupt(clientInterrupt.type);
            } else if (serverInterrupt && clientInterrupt && serverInterrupt.type === clientInterrupt.type) {
                // Types match - Update payload if needed
                interruptManager.updateInterrupt(serverInterrupt.type, serverInterrupt.data || serverInterrupt.payload);
            } else if (serverInterrupt && clientInterrupt && serverInterrupt.type !== clientInterrupt.type) {
                // Types mismatch - End old and start new
                interruptManager.resolveInterrupt(clientInterrupt.type);
                interruptManager.requestInterrupt(serverInterrupt.type, serverInterrupt.data || serverInterrupt.payload);
            }
        });
    }

    async init() {
        // Load the default scene by its key on startup. Change to speed up Director/Debug testing.
        await this.loadScene('conn');
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

        // 2.1. Reset Global Logic Managers (Test Mode Only)
        // Resetting phase to LOBBY ensures that any new state update (e.g. to LIVE)
        // is always a valid transition, avoiding warnings during scenario reloads.
        const isTestMode = new URLSearchParams(window.location.search).has('mode', 'test');
        if (isTestMode) {
            gamePhaseManager.reset();
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
        this.currentController.app = this.app;
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
