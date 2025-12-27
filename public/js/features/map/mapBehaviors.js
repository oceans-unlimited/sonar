import { MapConstants } from './mapConstants.js';

/**
 * Map Behaviors
 * Attaches input handling to the Map feature.
 */
export function attachMapBehaviors(app, controller) {
    const { renderer } = controller;
    const { container } = renderer;

    const keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
    };

    let inactivityTimer = null;

    const stopInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
    };

    const startInactivityTimer = () => {
        stopInactivityTimer();
        inactivityTimer = setTimeout(() => {
            controller.centerOnPosition();
        }, MapConstants.INACTIVITY_TIMEOUT);
    };

    // Keyboard Handling
    const onKeyDown = (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = true;
            e.preventDefault();
            stopInactivityTimer();
        }
    };

    const onKeyUp = (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = false;
            if (!Object.values(keys).some(k => k)) {
                startInactivityTimer();
            }
        }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Wheel
    const onWheel = (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        controller.stepZoom(direction);
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    // Ticker Loop for Keyboard Pan
    const speed = MapConstants.PAN_SPEED;
    const panTicker = () => {
        if (!container || container.destroyed) return;

        let dx = 0;
        let dy = 0;
        if (keys.ArrowUp) dy += speed;
        if (keys.ArrowDown) dy -= speed;
        if (keys.ArrowLeft) dx += speed;
        if (keys.ArrowRight) dx -= speed;

        if (dx !== 0 || dy !== 0) {
            renderer.mapContent.x += dx;
            renderer.mapContent.y += dy;
            renderer.clampPosition();
        }
    };
    app.ticker.add(panTicker);

    // Cleanup
    container.on('destroyed', () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('wheel', onWheel);
        app.ticker.remove(panTicker);
        stopInactivityTimer();
    });

    return {
        stopInactivityTimer,
        startInactivityTimer
    };
}
