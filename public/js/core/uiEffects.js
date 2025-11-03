// Creates reusable Pixi layers for noise, scanlines, flicker, glow filters, etc.

import * as PIXI from "pixi.js";
import { GlowFilter } from 'pixi-filters';
import { Colors } from './uiStyle.js';

export function createNoiseOverlay(texture, app, width, height) {
  const sprite = new PIXI.TilingSprite({texture, width, height});
  sprite.alpha = 0.05;
  return sprite;
}

export function createScanlinesOverlay(texture, app, width, height) {
  const sprite = new PIXI.TilingSprite({texture, width, height});
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

export function createButtonStateManager(button, app) {
  const glow = applyGlowEffect(button, app, Colors.text);
  glow.off();

  const redX = new PIXI.Text({text:'X', style:{
    fontFamily: 'Arial',
    fontSize: Math.min(button.width, button.height) * 0.8, // Scale X to button size
    fill: Colors.subB, // Red color
    align: 'center',
  }});
  redX.anchor.set(0.5);
  redX.position.set(button.width / 2, button.height / 2);
  redX.visible = false;
  button.addChild(redX);

  let isPushed = false;

  const setActive = () => {
    isPushed = false;
    button.alpha = 1;
    glow.steadyOn(2); // Slight glow
    redX.visible = false;
    button.eventMode = 'static';
    button.cursor = 'pointer';
  };

  const setDisabled = () => {
    isPushed = false;
    button.alpha = 0.5;
    glow.off();
    redX.visible = false;
    button.eventMode = 'none';
    button.cursor = 'default';
  };

  const setPushed = () => {
    isPushed = true;
    button.alpha = 0.3;
    glow.off();
    redX.visible = true;
    button.eventMode = 'none';
    button.cursor = 'default';
  };

  // Initial state
  setActive();

  return {
    setActive,
    setDisabled,
    setPushed,
    isPushed: () => isPushed,
  };
}

export function applyColorBlink(targets, app, foregroundColor, backgroundColor, flickerCount = 2, flickOn = true) {
    if (!Array.isArray(targets)) {
        targets = [targets];
    }

    let currentTicker = null;

    const blink = () => {
        if (currentTicker) {
            app.ticker.remove(currentTicker);
        }

        let count = 0;
        const maxCount = flickerCount;
        const interval = 6; // run every 4 frames for example
        let frameCounter = 0;

        // Start with the background color
        targets.forEach(target => { target.tint = backgroundColor; });

        currentTicker = () => {
            frameCounter++;
            if (frameCounter % interval === 0) {
                count++;
                if (count > maxCount) {
                    targets.forEach(target => { target.tint = flickOn ? foregroundColor : backgroundColor; });
                    app.ticker.remove(currentTicker);
                    currentTicker = null;
                    return;
                }

                if (targets[0].tint === foregroundColor) {
                    targets.forEach(target => { target.tint = backgroundColor; });
                } else {
                    targets.forEach(target => { target.tint = foregroundColor; });
                }
            }
        };

        app.ticker.add(currentTicker);
    };

    const destroy = () => {
        if (currentTicker) {
            app.ticker.remove(currentTicker);
            currentTicker = null;
        }
    };

    targets.forEach(target => {
        target.on('destroyed', destroy);
    });

    return {
        blink,
        destroy,
    };
}
