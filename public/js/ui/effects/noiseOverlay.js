import * as PIXI from "pixi.js";

export function createNoiseOverlay(texture, app, width, height) {
    const sprite = new PIXI.TilingSprite({ texture, width, height });
    sprite.alpha = 0.05;
    sprite.eventMode = 'none';
    return sprite;
}

export function createScanlinesOverlay(texture, app, width, height) {
    const sprite = new PIXI.TilingSprite({ texture, width, height });
    sprite.alpha = 0.03;
    sprite.eventMode = 'none';
    return sprite;
}
