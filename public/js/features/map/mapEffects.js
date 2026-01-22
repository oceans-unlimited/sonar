/**
 * Map Effects
 * Visual-only animations for the map.
 */

import { MapUtils } from '../../utils/mapUtils.js';

export function animateMapZoom(app, mapRenderer, targetScale, duration = 400, onComplete = null) {
    if (mapRenderer.zoomTicker) {
        app.ticker.remove(mapRenderer.zoomTicker);
    }

    const startScale = mapRenderer.currentScale;
    const diff = targetScale - startScale;
    let elapsed = 0;

    // Zoom-to-center logic: find the point currently at the visual center
    const viewportCenter = {
        x: mapRenderer.maskWidth / 2 + mapRenderer.labelGutter,
        y: mapRenderer.maskHeight / 2 + mapRenderer.labelGutter
    };

    const mapContentPos = {
        x: mapRenderer.mapContent.x,
        y: mapRenderer.mapContent.y
    };

    const focusPoint = MapUtils.getGridLocal(viewportCenter, mapContentPos, startScale);

    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    mapRenderer.zoomTicker = (delta) => {
        elapsed += delta.deltaMS;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeInOutCubic(progress);

        const currentScale = startScale + diff * easedProgress;
        mapRenderer.currentScale = currentScale;

        // Keep focus point stable at viewport center
        const newOffset = MapUtils.getMapOffset(viewportCenter, focusPoint, currentScale);
        mapRenderer.mapContent.x = newOffset.x;
        mapRenderer.mapContent.y = newOffset.y;

        mapRenderer.renderMap();
        mapRenderer.clampPosition();

        if (progress === 1) {
            app.ticker.remove(mapRenderer.zoomTicker);
            mapRenderer.zoomTicker = null;
            if (onComplete) onComplete();
        }
    };

    app.ticker.add(mapRenderer.zoomTicker);
}

export function animateMapPosition(app, mapRenderer, targetX, targetY, duration = 400, onComplete = null) {
    if (mapRenderer.panTicker) {
        app.ticker.remove(mapRenderer.panTicker);
    }

    const startX = mapRenderer.mapContent.x;
    const startY = mapRenderer.mapContent.y;
    const diffX = targetX - startX;
    const diffY = targetY - startY;
    let elapsed = 0;

    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    mapRenderer.panTicker = (delta) => {
        elapsed += delta.deltaMS;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeInOutCubic(progress);

        mapRenderer.mapContent.x = startX + diffX * easedProgress;
        mapRenderer.mapContent.y = startY + diffY * easedProgress;
        mapRenderer.clampPosition();

        if (progress === 1) {
            app.ticker.remove(mapRenderer.panTicker);
            mapRenderer.panTicker = null;
            if (onComplete) onComplete();
        }
    };

    app.ticker.add(mapRenderer.panTicker);
}

export function flashSelection(app, target, duration = 200, count = 3, onComplete = null) {
    if (!target) return;

    let frame = 0;
    let cycles = 0;
    // Rapid toggle interval (e.g., every 4 frames)
    const interval = 4;

    const flashTicker = () => {
        if (!target || target.destroyed) {
            app.ticker.remove(flashTicker);
            return;
        }

        frame++;
        if (frame % interval === 0) {
            target.visible = !target.visible;
            cycles++;

            // End on visible after specified toggles
            if (cycles >= count) {
                target.visible = true;
                app.ticker.remove(flashTicker);
                if (onComplete) onComplete();
            }
        }
    };

    app.ticker.add(flashTicker);

    // Return cancel function
    return () => app.ticker.remove(flashTicker);
}

/**
 * Detonation Animation
 * Auto-panning to target should be handled by the controller before calling this.
 * Animates a 3x3 expansion of explosion sprites.
 */
export function animateDetonation(app, mapRenderer, centerRow, centerCol, onComplete = null) {
    const explosionDuration = 600;
    const shockwaveDelay = 100;

    const animateExplosion = (row, col, delay = 0) => {
        setTimeout(() => {
            if (mapRenderer.app.destroyed) return;

            const sprite = mapRenderer.getExplosionSprite(row, col);
            let elapsed = 0;

            const ticker = (delta) => {
                elapsed += delta.deltaMS;
                const progress = Math.min(1, elapsed / explosionDuration);

                // Expand and fade out
                sprite.scale.set(0.5 + progress * 2.0); // 0.5 to 2.5
                sprite.alpha = 1 - progress;

                if (progress === 1) {
                    app.ticker.remove(ticker);
                    mapRenderer.returnExplosionSprite(sprite);
                }
            };
            app.ticker.add(ticker);
        }, delay);
    };

    // Epicenter
    animateExplosion(centerRow, centerCol, 0);

    // Shockwave (8 neighbors)
    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
            if (r === centerRow && c === centerCol) continue;
            // Bounds check for grid (15x15)
            if (r >= 0 && r < 15 && c >= 0 && c < 15) {
                animateExplosion(r, c, shockwaveDelay);
            }
        }
    }

    // Completion callback after the longest animation finishes
    if (onComplete) {
        setTimeout(onComplete, explosionDuration + shockwaveDelay);
    }
}

