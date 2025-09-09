// js/titleScene.js
export async function createTitleScene(app) {

  // Background gradient overlay
  const bg = new PIXI.Graphics();
  const gradient = new PIXI.FillGradient({
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
  bg.drawRect(0, 0, app.screen.width, app.screen.height);
  app.stage.addChild(bg);

  // Load god-ray texture
  const texture = await PIXI.Assets.load('../assets/light_rays.png');
  const rays = new PIXI.Sprite(texture);

  rays.alpha = 0.15;
  rays.width = app.screen.width;
  rays.height = app.screen.height * 1.5; // oversize for movement
  app.stage.addChild(rays);

  // Add god-ray filter
  const { GodrayFilter } = PIXI.filters;
  const godray = new GodrayFilter({
    gain: 0.4,
    lacunarity: 2.0,
    angle: 30,
    parallel: false
  });
  rays.filters = [godray];

  // Animate light rays
  app.ticker.add((delta) => {
    rays.y += 0.05 * delta; //slow drift
    if (rays.y > 0) rays.y = -app.screen.height * 0.5;

  // subtle flicker/pulse
    rays.alpha = 0.2 + Math.sin(app.ticker.lastTime * 0.001) * 0.05;

  // animate godray phase
    godray.time += 0.01 * delta;
  });

  // Title text
  const title = new PIXI.Text({
    text: "Captain Sonar v2.0",
    style: {
      fontFamily: "Arial",
      fontSize: 64,
      fill: "#00ff99",
      stroke: { color: "#000000", width: 6 }, // Modern way for stroke
      dropShadow: {
        color: "#000000",
        blur: 4,
        angle: Math.PI / 6,
        distance: 6
      }
    },
    anchor: 0.5
  });
  title.x = app.screen.width / 2;
  title.y = 120;
  app.stage.addChild(title);

    // --- Menu placeholder ---
  const startText = new PIXI.Text({
    text: "Start",
    style: {
      fontFamily: "Arial",
      fontSize: 36,
      fill: 0x00ffff
    },
    anchor: 0.5
  });
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