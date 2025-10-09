// Creates reusable Pixi layers for noise, scanlines, flicker, glow filters, etc.

import * as PIXI from "pixi.js";
import { GlowFilter } from 'pixi-filters';

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

export function applyGlowEffect(target, app, color) {
    const glow = new GlowFilter({
        distance: 10,
        outerStrength: 0,
        innerStrength: 0,
        color: color,
        quality: 0.2
    });
    target.filters = [glow];

    let pulseTicker = null;

    const pulse = () => {
        if (pulseTicker) return;
        let time = 0;
        pulseTicker = () => {
            time += 0.05;
            glow.outerStrength = 2 + Math.sin(time) * 1.5;
        };
        app.ticker.add(pulseTicker);
    };

    const steadyOn = (strength = 2) => {
        if (pulseTicker) {
            app.ticker.remove(pulseTicker);
            pulseTicker = null;
        }
        glow.outerStrength = strength;
    };

    const off = () => {
        if (pulseTicker) {
            app.ticker.remove(pulseTicker);
            pulseTicker = null;
        }
        glow.outerStrength = 0;
    };

    target.on('destroyed', () => {
        if (pulseTicker) {
            app.ticker.remove(pulseTicker);
        }
    });

    return {
        pulse,
        steadyOn,
        off,
        glowFilter: glow
    };
}
