// js/client.js
import { Application } from 'pixi.js';
import { createTitleScene } from './titleScene.js';

(async () => {
  // Create a new application
  const app = new Application();
  // The background color is set by the scene, so we don't need it here.
  await app.init({ resizeTo: window });
  document.body.appendChild(app.canvas);

  createTitleScene(app);
})();
