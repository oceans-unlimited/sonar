// Creates reusable Pixi layers for noise, scanlines, flicker, glow filters, etc.

import * as PIXI from "pixi.js";

export function createNoiseOverlay(texture, app) {
  const sprite = new PIXI.TilingSprite({texture, width: app.screen.width, height: app.screen.height});
  sprite.alpha = 0.05;
  return sprite;
}

export function createScanlinesOverlay(texture, app) {
  const sprite = new PIXI.TilingSprite({texture, width: app.screen.width, height: app.screen.height});
  sprite.alpha = 0.03;
  return sprite;
}

export function applyFlickerEffect(app, targets, amplitude = 0.02, frequency = 10) {
  const flickerCallback = () => {
    const flicker = 1 + Math.sin(app.ticker.lastTime * frequency * 0.001) * amplitude;
    for (const obj of targets) {
        obj.alpha = flicker;
    }
  };
  app.ticker.add(flickerCallback);

  return flickerCallback;
}
