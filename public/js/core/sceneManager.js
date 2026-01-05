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
import { createMapTestScene } from '../scenes/mapTestScene.js';
import { mockLayout } from '../mockEngineLayout.js';
import { gamePhaseManager, GamePhases } from './clock/gamePhaseManager.js';
import { ClockEvents } from './clock/clockEvents.js';
import { interruptManager } from '../features/interrupts/InterruptManager.js';

const scenes = {
    boot: createBootScene,
    title: createTitleScene,
    menu: createMenuScene,
    conn: createConnScene,
    lobby: createLobbyScene,
    engine: createEngineScene,
    xo: createXOScene,
    mapTest: createMapTestScene,
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

        gamePhaseManager.subscribe((event, payload) => {
            if (event === ClockEvents.PHASE_CHANGE) {
                this.handlePhaseChange(payload.phase);
            }
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.currentSceneName) {
                    this.changeScene(this.currentSceneName);
                }
            }, 200);
        });

        await this.changeScene('boot'); // Start with the boot scene
    },

    onStateUpdate(state) {
        if (state.phase) {
            gamePhaseManager.setPhase(GamePhases[state.phase] || state.phase);
        }

        // Sync active interrupt
        const serverInterrupt = state.activeInterrupt;
        const clientInterrupt = interruptManager.getActiveInterrupt();

        if (serverInterrupt && !clientInterrupt) {
            // Server has interrupt, client doesn't - Start it
            interruptManager.requestInterrupt(serverInterrupt.type, serverInterrupt.payload);
        } else if (!serverInterrupt && clientInterrupt) {
            // Server has no interrupt, client does - Resolve it
            interruptManager.resolveInterrupt(clientInterrupt.type);
        } else if (serverInterrupt && clientInterrupt && serverInterrupt.type === clientInterrupt.type) {
            // Types match - Update payload if needed
            interruptManager.updateInterrupt(serverInterrupt.type, serverInterrupt.payload);
        } else if (serverInterrupt && clientInterrupt && serverInterrupt.type !== clientInterrupt.type) {
            // Types mismatch - End old and start new
            interruptManager.resolveInterrupt(clientInterrupt.type);
            interruptManager.requestInterrupt(serverInterrupt.type, serverInterrupt.payload);
        }
    },

    handlePhaseChange(phase) {
        if (phase === GamePhases.LOBBY) {
            if (this.currentSceneName !== 'lobby') {
                this.changeScene('lobby');
            }
            return;
        }

        if (
            phase === GamePhases.GAME_BEGINNING ||
            phase === GamePhases.INTERRUPT ||
            phase === GamePhases.LIVE
        ) {
            const role = this._getPlayerRole();
            let targetScene = 'conn'; // Default to conn if role unknown or for co

            if (role === 'xo') targetScene = 'xo';
            else if (role === 'eng') targetScene = 'engine';
            // sonar handled as conn for now or could have its own later

            if (this.currentSceneName !== targetScene) {
                this.changeScene(targetScene);
            }
        }
    },

    /**
     * Helper to determine the current player's role from the last known state.
     * @returns {string|null}
     */
    _getPlayerRole() {
        const state = socketManager.lastState;
        const playerId = socketManager.playerId;
        if (!state || !playerId || !state.submarines) return null;

        for (const sub of state.submarines) {
            if (sub.co === playerId) return 'co';
            if (sub.xo === playerId) return 'xo';
            if (sub.eng === playerId) return 'eng';
            if (sub.sonar === playerId) return 'sonar';
        }
        return null;
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