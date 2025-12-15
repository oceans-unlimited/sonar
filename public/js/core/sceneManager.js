// C:/web_dev_ai/sonar/public/js/core/sceneManager.js
/**
 * Manages the scenes in the game.
 */
import * as PIXI from 'pixi.js';
import { createMenuScene } from '../scenes/menuScene.js';
import { createLobbyScene } from '../scenes/lobbyScene.js';
import { createConnScene } from '../scenes/connScene.js';
import { createTitleScene } from '../titleScene.js';
import { createDebugRotationScene } from '../scenes/debugRotationScene.js';
import { createBootScene } from '../scenes/bootScene.js';
import { createEngineScene } from '../scenes/engineScene.js';
import { createXOScene } from '../scenes/xoScene.js';
import { mockLayout } from '../mockEngineLayout.js';

const scenes = {
    boot: createBootScene,
    title: createTitleScene,
    menu: createMenuScene,
    conn: createConnScene,
    lobby: createLobbyScene,
    engine: createEngineScene,
    xo: createXOScene,
    debugRotation: createDebugRotationScene,
};

let app;
let currentScene;

async function fadeTo(target, alpha, duration) {
    return new Promise((resolve) => {
        const startAlpha = target.alpha;
        const diff = alpha - startAlpha;

        let elapsed = 0;
        const ticker = (delta) => {
            elapsed += delta.deltaMS;
            const t = Math.min(1, elapsed / duration);
            target.alpha = startAlpha + diff * t;
            if (t === 1) {
                app.ticker.remove(ticker);
                resolve();
            }
        };
        app.ticker.add(ticker);
    });
}

async function fadeIn(duration) {
    const fade = new PIXI.Graphics()
        .rect(0, 0, app.screen.width, app.screen.height)
        .fill({ color: 0x000000, alpha: 1 });
    app.stage.addChild(fade);

    let elapsed = 0;
    const ticker = (delta) => {
        elapsed += delta.deltaMS;
        const t = Math.min(1, elapsed / duration);
        fade.alpha = 1 - t;
        if (t === 1) {
            app.ticker.remove(ticker);
            app.stage.removeChild(fade);
        }
    };
    app.ticker.add(ticker);
}

let assets;
let socketManager;
let audioManager;

export const SceneManager = {
    /**
     * Initializes the scene manager.
     * @param {PIXI.Application} pixiApp - The PIXI Application instance.
     * @param {object} loadedAssets - The loaded game assets.
     * @param {SocketManager} sockManager - The socket manager instance.
     * @param {AudioManager} audManager - The audio manager instance.
     */
    async init(pixiApp, loadedAssets, sockManager, audManager) {
        app = pixiApp;
        assets = loadedAssets;
        socketManager = sockManager;
        audioManager = audManager;

        socketManager.on('stateUpdate', (state) => {
            this.onStateUpdate(state);
        });

        await this.changeScene('boot'); // Start with the boot scene
    },

    onStateUpdate(state) {
        if (state.currentState === 'lobby' && this.currentSceneName !== 'lobby') {
            this.changeScene('lobby');
        } else if (state.currentState === 'in_game' && this.currentSceneName !== 'conn') {
            this.changeScene('conn');
        }
    },

    /**
     * Changes the current scene.
     * @param {string} sceneName - The name of the scene to switch to.
     */
    async changeScene(sceneName) {
        if (currentScene) {
            await fadeTo(currentScene, 0, 500);
            app.stage.removeChild(currentScene);
            currentScene.destroy({ children: true });
        }

        if (scenes[sceneName]) {
            this.currentSceneName = sceneName;
            let state = socketManager.lastState;
            if (sceneName === 'engine') {
                state = { submarines: [{ engineLayout: mockLayout }] };
            }
            const newScene = await scenes[sceneName](app, assets, audioManager, state);
            if (newScene instanceof PIXI.Container) {
                currentScene = newScene;
                app.stage.addChild(currentScene);
                await fadeIn(500);
            }
        } else {
            console.error(`Scene "${sceneName}" not found.`);
        }
    }
};