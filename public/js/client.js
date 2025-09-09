// js/client.js
import { createTitleScene } from "./titleScene.js";

(async () => {
  // Create new app
  const app = new PIXI.Application();
  await app.init({ background: 0x171f21, resizeTo: window });
  document.body.appendChild(app.canvas);

  createTitleScene(app);
  // Create main container
  // const container = new PIXI.Container();
  // app.stage.addChild(container);
})();

