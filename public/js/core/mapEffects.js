export function animateMapZoom(app, mapRenderer, targetScale, duration = 400) {
    if (mapRenderer.zoomTicker) {
        app.ticker.remove(mapRenderer.zoomTicker);
    }

    const startScale = mapRenderer.currentScale;
    const diff = targetScale - startScale;
    let elapsed = 0;

    // Smooth acceleration/deceleration using cubic easing
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    mapRenderer.zoomTicker = (delta) => {
        elapsed += delta.deltaMS;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeInOutCubic(progress);

        mapRenderer.currentScale = startScale + diff * easedProgress;
        mapRenderer.renderMap();
        mapRenderer.clampPosition();

        if (progress === 1) {
            app.ticker.remove(mapRenderer.zoomTicker);
            mapRenderer.zoomTicker = null;
        }
    };

    app.ticker.add(mapRenderer.zoomTicker);
}
