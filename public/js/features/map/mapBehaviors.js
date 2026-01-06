import { MapConstants, MapStates } from './mapConstants.js';

/**
 * Map Behaviors
 * Attaches input handling to the Map feature.
 */
export function attachMapBehaviors(app, controller) {
    const { renderer } = controller;
    const { hitSurface } = renderer;

    const keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
    };

    // Activity delegation
    const reportActivity = () => {
        controller.handleActivity();
    };

    // Interaction State
    let isPotentialClick = false;
    let isDragging = false;
    let pressStartTime = 0;
    let dragStart = { x: 0, y: 0 };
    let mapStart = { x: 0, y: 0 };
    let lastPinchDist = 0;
    let longPressTimer = null;

    hitSurface.cursor = 'grab';

    const fireShortClick = (e) => {
        const coords = controller.getGridFromPointer(e.global);
        if (coords) controller.selectSquare(coords);
    };

    const fireContextPress = (e) => {
        const coords = controller.getGridFromPointer(e.global);
        if (coords) controller.contextSelectSquare(coords);
    };

    const onPointerDown = (e) => {
        const touches = e.getNativeEvent ? e.getNativeEvent().touches : null;
        if (touches && touches.length >= 2) {
            isDragging = false;
            lastPinchDist = getPinchDist(touches);
            return;
        }

        // Handle Right Click (Context Menu)
        if (e.button === 2) {
            fireContextPress(e);
            return;
        }

        isPotentialClick = true;
        isDragging = false;
        pressStartTime = performance.now();
        dragStart = { x: e.global.x, y: e.global.y };
        mapStart = { x: renderer.mapContent.x, y: renderer.mapContent.y };
        reportActivity();

        // Start Long Press Timer
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            if (isPotentialClick && !isDragging) {
                fireContextPress(e);
                isPotentialClick = false; // Prevent selection click on release
            }
        }, MapConstants.LONG_PRESS_MS);
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
            if (Math.hypot(dx, dy) > MapConstants.DRAG_THRESHOLD_PX) {
                isDragging = true;
                isPotentialClick = false;
                clearTimeout(longPressTimer);
                hitSurface.cursor = 'grabbing';

                // State Transition
                controller.setState(MapStates.PAN);
                // Clear any preview when dragging starts
                controller.handleHoverOut();
            }
        }

        if (isDragging) {
            renderer.mapContent.x = mapStart.x + dx;
            renderer.mapContent.y = mapStart.y + dy;
            renderer.clampPosition();
            // Dragging clears HUD/Preview implicitly via handleHoverOut above
        } else {
            // Critical Guard: No hover updates during PAN or ANIMATING
            if (controller.state === MapStates.PAN || controller.state === MapStates.ANIMATING) return;

            // Hover Logic: Pure Input Translation
            const coords = controller.getGridFromPointer(e.global);
            if (coords) {
                controller.handleHover(coords);
            }
            else {
                controller.handleHoverOut();
            }

            // Report activity during hover to prevent centerOnPosition interrupt
            reportActivity();
        }
    };

    const onPointerOut = () => {
        if (!isDragging) {
            controller.handleHoverOut();
        }
    };


    const onPointerUp = (e) => {
        clearTimeout(longPressTimer);

        if (isPotentialClick) {
            const duration = performance.now() - pressStartTime;
            if (duration <= MapConstants.CLICK_MAX_MS) {
                fireShortClick(e);
            }
        }

        isDragging = false;
        isPotentialClick = false;
        hitSurface.cursor = 'grab';

        // If we were dragging, we are now done. Return to SELECTING.
        if (controller.state === MapStates.PAN) {
            controller.setState(MapStates.SELECTING);
        }

        // Activity handled by reportActivity below
        // Actually handleActivity restarts it every time.
        reportActivity();
    };

    hitSurface.on('pointerdown', onPointerDown);
    hitSurface.on('globalpointermove', onPointerMove);
    hitSurface.on('pointerup', onPointerUp);
    hitSurface.on('pointerupoutside', onPointerUp);
    hitSurface.on('pointerout', onPointerOut);

    // Prevent default context menu for right-click handling
    const preventContextMenu = (e) => e.preventDefault();
    window.addEventListener('contextmenu', preventContextMenu);


    // Keyboard Handling
    const onKeyDown = (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = true;
            e.preventDefault();
            reportActivity();
        } else if (e.code === 'Escape') {
            controller.clearSelection();
        }
    };

    const onKeyUp = (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = false;
            // No need to explicitly check empty keys for timer restart, handled by interaction
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
        if (!renderer.container || renderer.container.destroyed) return;

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
    renderer.container.on('destroyed', () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('contextmenu', preventContextMenu);
        app.ticker.remove(panTicker);
        // stopInactivityTimer not needed, handled by controller
        clearTimeout(longPressTimer);

        hitSurface.off('pointerdown', onPointerDown);
        hitSurface.off('globalpointermove', onPointerMove);
        hitSurface.off('pointerup', onPointerUp);
        hitSurface.off('pointerupoutside', onPointerUp);
        hitSurface.off('pointerout', onPointerOut);
    });



    return {
        // no exposed methods needed currently
    };
}
