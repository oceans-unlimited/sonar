// public/js/scenes/engineScene.js
import * as PIXI from 'pixi.js';
import { EngineRenderer } from '../renderers/engineRenderer.js';
import { EngineController } from '../controllers/engineController.js';
import { createButtonStateManager } from '../ui/behaviors/buttonStateManager.js';
import { applyFlickerEffect } from '../ui/effects/flickerEffect.js';
import { renderInterruptUI } from '../renderers/interrupts/interruptRenderer.js';

/**
 * Engine Scene (Lifecycle Orchestration)
 */
export function createEngineScene(app, assets, audioManager, state) {
    const scene = new PIXI.Container();

    // 1. Initialize Renderer
    const renderer = new EngineRenderer(app, assets);
    const view = renderer.render(scene);

    // 2. Initialize Controller
    const controller = new EngineController(app, renderer);
    controller.init();

    // 3. Attach Behaviors & Populate Buttons
    // This connects the renderer's slots with specialized buttons and state managers.
    // In a real game, 'state' would inform which buttons are pushed.
    const MOCK_LAYOUT = state.submarines[0].engineLayout;

    view.directionTemplates.forEach((template, direction) => {
        const directionLayout = MOCK_LAYOUT.directions[direction];

        template.slots.forEach(slot => {
            const systemData = directionLayout.frameSlots[slot.slotId] || directionLayout.reactorSlots[slot.slotId];
            if (systemData) {
                const button = renderer.renderSystemButton(systemData.system);
                slot.addChild(button);

                const stateManager = createButtonStateManager(button, app, assets.disabled);

                button.on('pointerdown', () => {
                    if (!stateManager.isPushed()) {
                        controller.handleButtonPress(direction, slot.slotId, systemData.system);
                        stateManager.setPushed();
                    }
                });

                if (systemData.pushed) {
                    stateManager.setPushed();
                } else {
                    stateManager.setDisabled(); // Default to disabled as in original
                }
            }
        });
    });

    // Keyboard simulation (as in original)
    const handleKeyDown = (e) => {
        if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
            const dirMap = { ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E' };
            controller.handleDirectionChange(dirMap[e.key]);
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 4. Effects
    const flickerCallback = applyFlickerEffect(app, [scene]);

    scene.on('destroyed', () => {
        app.ticker.remove(flickerCallback);
        window.removeEventListener('keydown', handleKeyDown);
    });

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

    return scene;
}
