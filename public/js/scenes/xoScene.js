// public/js/scenes/xoScene.js
import * as PIXI from "pixi.js";
import { XORenderer } from "../renderers/xoRenderer.js";
import { XOController } from "../controllers/xoController.js";
import { applyFlickerEffect } from "../ui/effects/flickerEffect.js";
import { renderInterruptUI } from "../renderers/interrupts/interruptRenderer.js";

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

    // Interrupt Overlay Management
    let interruptOverlay = null;

    scene.on('show_interrupt_overlay', (options) => {
        if (interruptOverlay) return;
        interruptOverlay = renderInterruptUI(app, { ...options, center: true });
        scene.addChild(interruptOverlay);
    });

    scene.on('hide_interrupt_overlay', () => {
        if (interruptOverlay) {
            scene.removeChild(interruptOverlay);
            interruptOverlay.destroy({ children: true });
            interruptOverlay = null;
        }
    });

    return scene;
}
