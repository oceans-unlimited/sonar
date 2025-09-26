// js/client.js
import { Application, Assets } from 'pixi.js';
import { SceneManager } from './core/sceneManager.js';

(async () => {
  // Create a new application
  const app = new Application();
  // The background color is set by the scene, so we don't need it here.
  await app.init({ resizeTo: window });
  document.body.appendChild(app.canvas);

  // Pre-load any assets needed for the scenes
  const assets = {
      // placeholder for assets. In a real app, you'd load them here.
      noise: await Assets.load('assets/textures/noise.png'),
      scanlines: await Assets.load('assets/textures/scanlines.png'),
      // chart_overlay will be needed by menuScene
      chart_overlay: await Assets.load('assets/light_rays.png'), // using a placeholder
      god_rays: await Assets.load('assets/textures/god_rays_03.png'),
  };

  await SceneManager.init(app, assets);

  document.getElementById('sceneTitleBtn').addEventListener('click', () => {
    SceneManager.changeScene('title');
  });
  document.getElementById('sceneMenuBtn').addEventListener('click', () => {
    SceneManager.changeScene('menu');
  });
  document.getElementById('sceneConnBtn').addEventListener('click', () => {
    SceneManager.changeScene('conn');
  });
})();
