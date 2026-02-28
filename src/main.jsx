/**
 * Main Entry Point — Vite-bundled client application.
 * Initializes PixiJS, loads assets, sets up SceneManager,
 * and conditionally enables Director Mode for testing.
 */

import { Application } from 'pixi.js';
import '@pixi/layout';
import '@pixi/layout/devtools';
import { SceneManager } from './core/sceneManager';
import { socketManager } from './core/socketManager';
import { assetManager } from './core/assets';

(async () => {
    // 1. Create PixiJS Application
    const app = new Application();
    globalThis.__PIXI_APP__ = app;

    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#001100',
        resizeTo: window,
    });

    app.stage.layout = {
        width: window.innerWidth,
        height: window.innerHeight,
        justifyContent: 'center',
        alignItems: 'center',
    };
    app.stage.label = 'stage';
    document.body.appendChild(app.canvas);

    // 2. Load Assets & Fonts
    const assets = await assetManager.init();

    // 3. Create Scene Manager
    const sceneManager = new SceneManager(app);

    // 4. Director Mode (test harness)
    const isTestMode = new URLSearchParams(window.location.search).has('mode', 'test');

    if (isTestMode) {
        console.log('🎬 DIRECTOR MODE ACTIVATED');
        const { Director } = await import('./debug/Director');
        const { DebugOverlay } = await import('./debug/DebugOverlay');
        const { SCENARIO_REGISTRY } = await import('./debug/scenarios/index.js');

        const director = new Director();
        director.registerScenarios(SCENARIO_REGISTRY);

        // Inject Director as mock socket
        app.director = director;
        socketManager.bindSocket(director);

        const overlay = new DebugOverlay(director, sceneManager);
        overlay.mount();
    } else {
        // 5. Production Mode — bind real socket
        if (typeof io !== 'undefined') {
            socketManager.bindSocket(io());
        }
    }

    // Load default scene (test)
    await sceneManager.init();
})();
