import { Graphics } from 'pixi.js';

/**
 * Applies screen shake to a container.
 * @param {import('pixi.js').Container} target - The container to shake.
 * @param {import('pixi.js').Ticker} ticker - The app ticker.
 * @param {number} intensity - Shake intensity in pixels.
 * @param {number} duration - Duration in ms.
 */
export function shake(target, ticker, intensity = 5, duration = 800) {
    const originalX = target.x;
    const originalY = target.y;
    let elapsed = 0;

    const shakeTicker = () => {
        elapsed += ticker.deltaMS;
        if (elapsed < duration) {
            target.x = originalX + (Math.random() * intensity * 2 - intensity);
            target.y = originalY + (Math.random() * intensity * 2 - intensity);
        } else {
            target.x = originalX;
            target.y = originalY;
            ticker.remove(shakeTicker);
        }
    };

    ticker.add(shakeTicker);
}

/**
 * Applies a red screen tint overlay.
 * @param {import('pixi.js').Container} root - The root container (stage) to add the tint to.
 * @param {import('pixi.js').Ticker} ticker - The app ticker.
 * @param {number} screenWidth - Width of the screen.
 * @param {number} screenHeight - Height of the screen.
 * @param {number} duration - Duration in ms.
 */
export function flashDamage(root, ticker, screenWidth, screenHeight, duration = 800) {
    const overlay = new Graphics();
    overlay.clear()
        .rect(0, 0, screenWidth, screenHeight)
        .fill({ color: 0xff0000, alpha: 0.5 });

    // Ensure overlay is on top
    overlay.zIndex = 9999;
    if (root.sortableChildren === false) {
        root.sortableChildren = true;
    }

    root.addChild(overlay);

    let elapsed = 0;
    const fadeTicker = () => {
        elapsed += ticker.deltaMS;
        if (elapsed < duration) {
            overlay.alpha = 1 - (elapsed / duration);
        } else {
            overlay.removeFromParent();
            overlay.destroy();
            ticker.remove(fadeTicker);
        }
    };

    ticker.add(fadeTicker);
}
