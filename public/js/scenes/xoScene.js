// public/js/scenes/xoScene.js
import * as PIXI from "pixi.js";
import { XORenderer } from "../renderers/xoRenderer.js";
import { XOController } from "../controllers/xoController.js";
import { applyFlickerEffect } from "../ui/effects/flickerEffect.js";

/**
 * XO Scene (Lifecycle Orchestration)
 */
export async function createXOScene(app, assets) {
    const scene = new PIXI.Container();

    // 1. Initialize Renderer
    const renderer = new XORenderer(app, assets);
    const view = renderer.render(scene);

    // 2. Initialize Controller
    const controller = new XOController(app, renderer);
    controller.init();

    // 3. Attach Behaviors (Logic moved to Controller.init)

    // 4. Effects
    const flickerCallback = applyFlickerEffect(app, view.panels);

    scene.on('destroyed', () => {
        app.ticker.remove(flickerCallback);
        controller.destroy();
    });

    return scene;
}
