// public/js/scenes/connScene.js
import * as PIXI from 'pixi.js';
import { ConnRenderer } from '../renderers/connRenderer.js';
import { ConnController } from '../controllers/connController.js';
import { MapSystem } from '../features/map/MapSystem.js';
import { setupDraggableSidePanel } from '../ui/behaviors/draggablePanel.js';
import { applyFlickerEffect } from '../ui/effects/flickerEffect.js';
import { renderInterruptUI } from '../renderers/interrupts/interruptRenderer.js';

/**
 * Conn Scene (Lifecycle Orchestration)
 */
export async function createConnScene(app, assets) {
    const scene = new PIXI.Container();

    // 1. Initialize Feature Base (Map)
    const mapSystem = new MapSystem(app, assets);

    // 2. Initialize Renderer
    const renderer = new ConnRenderer(app, assets);
    const view = renderer.render(scene);

    // Mount Map into the renderer's container
    view.mapContainer.addChild(mapSystem.container);

    // 3. Initialize Controller
    const controller = new ConnController(app, renderer, mapSystem);
    controller.init();

    // 4. Attach Behaviors
    // Draggable Panel (Structural behavior remains in the scene)
    const CONTROLS_WIDTH = app.screen.width < 800 ? 270 : 300;
    const sidePanelManager = setupDraggableSidePanel(app, view.controlsPanel, view.controlsPanel, view.mapContainer, {
        width: CONTROLS_WIDTH,
        threshold: 15,
        holdTime: 300
    });

    // Effects
    const flickerCallback = applyFlickerEffect(app, [view.controlsPanel, view.dataOverlay]);

    // Interrupt Overlay Management
    let interruptOverlay = null;

    scene.on('show_interrupt_overlay', (options) => {
        if (interruptOverlay) {
            scene.removeChild(interruptOverlay);
            interruptOverlay.destroy({ children: true });
        }
        interruptOverlay = renderInterruptUI(app, assets, { ...options, center: true });
        scene.addChild(interruptOverlay);
    });

    scene.on('hide_interrupt_overlay', () => {
        if (interruptOverlay) {
            scene.removeChild(interruptOverlay);
            interruptOverlay.destroy({ children: true });
            interruptOverlay = null;
        }
    });

    scene.on('destroyed', () => {
        app.ticker.remove(flickerCallback);
        sidePanelManager.destroy();
        mapSystem.destroy();
    });

    return scene;
}
