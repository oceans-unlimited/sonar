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

    // Interaction State
    let isDragging = false;
    let isPotentialClick = false;
    let dragStart = { x: 0, y: 0 };
    let mapStart = { x: 0, y: 0 };
    let lastPinchDist = 0;
    const dragThreshold = 6;
    let longPressTimer = null;

    container.cursor = 'grab';

    const onPointerDown = (e) => {
        const touches = e.getNativeEvent ? e.getNativeEvent().touches : null;
        if (touches && touches.length >= 2) {
            isDragging = false;
            lastPinchDist = getPinchDist(touches);
            return;
        }

        // Handle Right Click (Context Inspect)
        if (e.button === 2) {
            handleContextInspect(e);
            return;
        }

        isPotentialClick = true;
        isDragging = false;
        dragStart = { x: e.global.x, y: e.global.y };
        mapStart = { x: renderer.mapContent.x, y: renderer.mapContent.y };
        stopInactivityTimer();

        // Start Long Press Timer for mobile/touch context inspect
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            if (isPotentialClick && !isDragging) {
                handleContextInspect(e);
                isPotentialClick = false; // Prevent selection click on release
            }
        }, 600);
    };

    const getPinchDist = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const onPointerMove = (e) => {
        const touches = e.getNativeEvent ? e.getNativeEvent().touches : e.nativeEvent?.touches;
        if (touches && touches.length >= 2) {
            const dist = getPinchDist(touches);
            const delta = dist - lastPinchDist;
            if (Math.abs(delta) > 5) {
                controller.stepZoom(delta > 0 ? 1 : -1);
                lastPinchDist = dist;
            }
            return;
        }

        const dx = e.global.x - dragStart.x;
        const dy = e.global.y - dragStart.y;

        if (!isDragging && isPotentialClick) {
            if (Math.hypot(dx, dy) > dragThreshold) {
                isDragging = true;
                isPotentialClick = false;
                container.cursor = 'grabbing';
                clearTimeout(longPressTimer);
            }
        }

        if (isDragging) {
            renderer.mapContent.x = mapStart.x + dx;
            renderer.mapContent.y = mapStart.y + dy;
            renderer.clampPosition();
            controller.syncHUD({ x: e.global.x, y: e.global.y });
        } else {
            // Hover Logic
            const coords = controller.getGridFromPointer(e.global);
            controller.setHoveredSquare(coords);
            controller.syncHUD({ x: e.global.x, y: e.global.y });
        }
    };

    const onPointerOut = () => {
        if (!isDragging) {
            controller.setHoveredSquare(null);
        }
    };


    const onPointerUp = (e) => {
        clearTimeout(longPressTimer);

        if (isPotentialClick) {
            handleGridClick(e);
        }

        isDragging = false;
        isPotentialClick = false;
        container.cursor = 'grab';
        startInactivityTimer();
    };

    const handleGridClick = (e) => {
        const coords = controller.getGridFromPointer(e.global);
        if (coords) {
            controller.selectSquare(coords);
        }
    };

    const handleContextInspect = (e) => {
        const coords = controller.getGridFromPointer(e.global);
        if (coords) {
            controller.inspectSquare(coords);
        }
    };

    container.on('pointerdown', onPointerDown);
    container.on('globalpointermove', onPointerMove);
    container.on('pointerup', onPointerUp);
    container.on('pointerupoutside', onPointerUp);
    container.on('pointerout', onPointerOut);

    // Prevent default context menu for right-click handling
    const preventContextMenu = (e) => e.preventDefault();
    window.addEventListener('contextmenu', preventContextMenu);


    // Keyboard Handling
    const onKeyDown = (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = true;
            e.preventDefault();
            stopInactivityTimer();
        } else if (e.code === 'Escape') {
            controller.clearSelection();
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
        window.removeEventListener('contextmenu', preventContextMenu);
        app.ticker.remove(panTicker);
        stopInactivityTimer();
        clearTimeout(longPressTimer);

        container.off('pointerdown', onPointerDown);
        container.off('globalpointermove', onPointerMove);
        container.off('pointerup', onPointerUp);
        container.off('pointerupoutside', onPointerUp);
    });



    return {
        stopInactivityTimer,
        startInactivityTimer
    };
}
