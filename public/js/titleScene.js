// js/titleScene.js
import { Graphics, FillGradient, Assets, Sprite, Text } from "pixi.js";
import { GodrayFilter } from "pixi-filters";

export async function createTitleScene(app) {

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
  app.stage.addChild(bg);

  // Load god-ray texture
  const texture = await Assets.load('../assets/light_rays.png');
  const rays = new Sprite(texture);

  rays.alpha = 0.15;
  rays.width = app.screen.width;
  rays.height = app.screen.height * 1.5; // oversize for movement
  app.stage.addChild(rays);

  // Add god-ray filter
  const godray = new GodrayFilter({
    gain: 0.4,
    lacunarity: 2.0,
    angle: 30,
    parallel: false
  });
  rays.filters = [godray];

  // Animate light rays
  app.ticker.add((ticker) => {
    rays.y += 0.05 * ticker.deltaTime; //slow drift
    if (rays.y > 0) rays.y = -app.screen.height * 0.5;

  // subtle flicker/pulse
    rays.alpha = 0.2 + Math.sin(ticker.lastTime * 0.001) * 0.05;

  // animate godray phase
    godray.time += 0.01 * ticker.deltaTime;
  });

  // Title text
  const title = new Text({
    text: "Captain Sonar v2.0",
    style: {
      fontFamily: "Arial",
      fontSize: 64,
      fill: "#00ff99",
      stroke: { color: "#000000", width: 6 },
      dropShadow: {
        color: "#000000",
        blur: 4,
        angle: Math.PI / 6,
        distance: 6
      }
    }
  });
  title.anchor.set(0.5);
  title.x = app.screen.width / 2;
  title.y = 120;
  app.stage.addChild(title);

    // --- Menu placeholder ---
  const startText = new Text({
    text:"Start", 
    style:{
      fontFamily: "Arial",
      fontSize: 36,
      fill: 0x00ffff
    }
  });
  startText.anchor.set(0.5);
  startText.x = app.screen.width / 2;
  startText.y = app.screen.height - 100;
  app.stage.addChild(startText);

  // Make "Click to Start" interactive
  startText.eventMode = "static";
  startText.cursor = "pointer";
  startText.on("pointerdown", () => {
    console.log("TODO: switch to game scene!");
  });
}
