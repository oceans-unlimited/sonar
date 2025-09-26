// C:/web_dev_ai/sonar/public/js/core/sceneManager.js
/**
 * Manages the scenes in the game.
 */
import * as PIXI from 'pixi.js';
import { createMenuScene } from '../scenes/menuScene.js';
import { createConnScene } from '../scenes/connScene.js';
import { createTitleScene } from '../titleScene.js';

const scenes = {
    title: createTitleScene,
    menu: createMenuScene,
    conn: createConnScene,
};

let app;
let currentScene;
let assets;

export const SceneManager = {
    /**
     * Initializes the scene manager.
     * @param {PIXI.Application} pixiApp - The PIXI Application instance.
     * @param {object} loadedAssets - The loaded game assets.
     */
    async init(pixiApp, loadedAssets) {
        app = pixiApp;
        assets = loadedAssets;
        await this.changeScene('title'); // Start with the title scene
    },

    /**
     * Changes the current scene.
     * @param {string} sceneName - The name of the scene to switch to.
     */
    async changeScene(sceneName) {
        if (currentScene) {
            app.stage.removeChild(currentScene);
            currentScene.destroy({ children: true });
        }

        if (scenes[sceneName]) {
            const newScene = await scenes[sceneName](app, assets);
            if (newScene instanceof PIXI.Container) {
                currentScene = newScene;
                app.stage.addChild(currentScene);
            }
        } else {
            console.error(`Scene "${sceneName}" not found.`);
        }
    }
};