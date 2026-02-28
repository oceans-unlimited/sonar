import { GlowFilter } from "pixi-filters";

/**
 * Filter-based active effects that require a ticker.
 */
export const applyGlowEffect = (target, { color = 0xFFFFFF, ticker } = {}) => {
  if (!target.filters) target.filters = [];

  const glow = new GlowFilter({
    distance: 10,
    outerStrength: 0,
    innerStrength: 0,
    color: color,
    quality: 0.2
  });
  
  target.filters.push(glow);

  let pulseTicker = null;

  const pulse = () => {
    if (pulseTicker || !ticker) return;
    
    let time = 0;
    pulseTicker = () => {     
      time += 0.05;
      glow.outerStrength = 1 + Math.sin(time) * 1.5;
    };
    ticker.add(pulseTicker);
  };

  const steadyOn = (strength = 2) => {
    if (pulseTicker && ticker) {
      ticker.remove(pulseTicker);
      pulseTicker = null;
    }
    glow.outerStrength = strength;
  }

  const off = () => {
    if (pulseTicker && ticker) {
      ticker.remove(pulseTicker);
      pulseTicker = null;
    }
    glow.outerStrength = 0;
  }

  target.on('destroyed', () => {
    if (pulseTicker && ticker) {
      ticker.remove(pulseTicker);
    }
  });

  return {
    pulse,
    steadyOn,
    off,
    glowFilter: glow
  };
};
