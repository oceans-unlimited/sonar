import { Container } from "pixi.js";
import { TitleRenderer } from "./renderers/titleRenderer.js";
import { TitleController } from "./controllers/titleController.js";

/**
 * Title Scene (MVC Orchestration)
 * Wires the TitleRenderer to the TitleController.
 */
export async function createTitleScene(app, assets, audioManager) {
  const scene = new Container();

  // 1. Initialize Renderer
  const renderer = new TitleRenderer(app, assets, audioManager);
  const views = renderer.render(scene);

  // 2. Initialize Controller
  const controller = new TitleController(app, renderer);
  controller.init();

  // 3. Since the menu is created asynchronously after the typewriter effect,
  // we need to wait or poll for the buttons to be attached.
  // However, Pixi Containers are dynamic. We can attach a listener to the scene 
  // or use a simpler approach: The renderer's createMenu method puts buttons in `views.buttons`.
  // Since `views` is returned by reference, we can check it.

  // Better Approach: The renderer is driving the animation loop. 
  // We can't attach listeners immediately because the buttons don't exist yet.
  // Solution: We'll wrap the `createMenu` logic in the renderer to emit an event or callback,
  // but sticking to "thin shell" philosophy, we can just intercept the click events if we assign them 
  // inside the renderer via a property, OR we just check for existence in a ticker?

  // Simplest Cleanest MVC Fix:
  // The renderer creates visual objects. When it creates them, they are just generic interactive objects.
  // We can't easily wait for them here without exposing the animation promise.
  // Let's modify the renderer to accept a callback for when the menu is ready, OR
  // just use event delegation? No, Pixi interaction is on objects.

  // REVISION: I will inject the interaction logic into the renderer via a "bind" method 
  // or simply wait. Let's rely on the fact that `views.buttons` will be populated eventually.
  // We can use a property observer or just loop.

  // ACTUALLY: The cleanest way is to pass the callbacks TO the renderer, 
  // but that blurs the line. 
  // Let's have the renderer emit a 'menuReady' event from the scene container.
  // Wait, `createMenu` in renderer is internal. 

  // Let's patch the renderer to emit an event on the scene container?
  // Or just Polling for now is robust enough for this simple case.

  const checkForButtons = () => {
    if (views.buttons && views.buttons.start && !views.buttons.start.hasControllerAttached) {

      // Wire Start Button
      views.buttons.start.on('pointertap', () => controller.handleStart());
      views.buttons.start.hasControllerAttached = true;

      // Wire Settings Button
      if (views.buttons.settings) {
        views.buttons.settings.on('pointertap', () => controller.handleSettings());
      }

      app.ticker.remove(checkForButtons);
    }
  };
  app.ticker.add(checkForButtons);

  scene.on('destroyed', () => {
    app.ticker.remove(checkForButtons);
    controller.destroy();
  });

  return scene;
}