// js/titleScene.js
import { Graphics, FillGradient, Assets, Sprite, Text, Container } from "pixi.js";
import { GodrayFilter } from "pixi-filters";

export async function createTitleScene(app, assets) {
  const scene = new Container();

  // Background gradient overlay
  const bg = new Graphics();
  const gradient = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: app.screen.height },
    colorStops: [
      { offset: 0, color: 0x263138 },
      { offset: 0.3, color: 0x171f21 },
      { offset: 0.8, color: 0x0c0c0c }
    ],
    textureSpace: 'global'
  });
  bg.fill(gradient);
  bg.rect({ x: 0, y: 0, w: app.screen.width, h: app.screen.height });
  scene.addChild(bg);

  const rays = new Sprite(assets.god_rays);

  rays.alpha = 0.1;
  rays.width = app.screen.width;
  rays.height = app.screen.height * 1.5; // oversize for movement
  scene.addChild(rays);

  // Add god-ray filter
  const godray = new GodrayFilter({
    alpha: 0.2,
    gain: 0.3,
    lacunarity: 2.7,
    angle: 20,
    parallel: true
  });
  rays.filters = [godray];

  // Animate light rays
  const tickerCallback = (ticker) => {
    rays.y += 0.05 * ticker.deltaTime; //slow drift
    if (rays.y > 0) rays.y = -app.screen.height * 0.5;

  // subtle flicker/pulse
    rays.alpha = 0.1 + Math.sin(ticker.lastTime * 0.001) * 0.05;

  // animate godray phase
    godray.time += 0.01 * ticker.deltaTime;
  };
  app.ticker.add(tickerCallback);

  scene.on('destroyed', () => {
    app.ticker.remove(tickerCallback);
  });

  return scene;
}