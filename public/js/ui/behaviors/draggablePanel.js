export function setupDraggableSidePanel(app, panel, interactableArea, alternateContainer, config = {}) {
    const {
        width = 300,
        threshold = 30, // Increased threshold
        holdTime = 300,
        onSideChange = null
    } = config;

    let panelSide = 'right'; // current snap state
    let isDragging = false;
    let isAutoTriggered = false;
    let dragStartGlobalX = 0;
    let dragStartPanelX = 0;
    let snapTicker = null;
    let holdTimer = null;

    // Movement constants
    const screenWidth = app.screen.width;
    const panelTravelDist = screenWidth - width;
    const altTravelDist = width;

    const animateSnap = () => {
        if (snapTicker) app.ticker.remove(snapTicker);

        const targetPanelX = panelSide === 'right' ? screenWidth - width : 0;
        const targetAltX = panelSide === 'right' ? 0 : width;
        const targetScale = 1.0;

        // Accelerated snap logic
        let velocity = 0;
        const acceleration = 2.5;
        const maxSpeed = 50;

        snapTicker = () => {
            const dp = targetPanelX - panel.x;
            const ds = targetScale - panel.scale.x;

            if (Math.abs(dp) < 2 && Math.abs(ds) < 0.01) {
                panel.x = targetPanelX;
                panel.scale.set(targetScale);
                if (alternateContainer) alternateContainer.x = targetAltX;
                app.ticker.remove(snapTicker);
                snapTicker = null;
            } else {
                velocity = Math.min(maxSpeed, velocity + acceleration);
                const stepX = Math.sign(dp) * velocity;

                // Update Panel X
                const nextPanelX = panel.x + stepX;
                if (Math.abs(dp) < Math.abs(stepX)) {
                    panel.x = targetPanelX;
                } else {
                    panel.x = nextPanelX;
                }

                // Update Alternate Container X (Proportional)
                if (alternateContainer) {
                    const ratio = altTravelDist / panelTravelDist;
                    const altStep = -stepX * ratio;
                    alternateContainer.x += altStep;
                    alternateContainer.x = Math.max(0, Math.min(width, alternateContainer.x));
                }

                // Scale back
                panel.scale.x += ds * 0.15;
                panel.scale.y += ds * 0.15;
            }
        };
        app.ticker.add(snapTicker);
    };

    const onPointerDown = (e) => {
        if (holdTimer) clearTimeout(holdTimer);
        isAutoTriggered = false;
        holdTimer = setTimeout(() => {
            isDragging = true;
            dragStartGlobalX = e.global.x;
            dragStartPanelX = panel.x;
            interactableArea.cursor = 'grabbing';

            // Detach feedback: Alpha + Scale
            panel.alpha = 0.8;
            panel.scale.set(1.05);

            if (snapTicker) {
                app.ticker.remove(snapTicker);
                snapTicker = null;
            }
        }, holdTime);
    };

    const onPointerMove = (e) => {
        if (!isDragging || isAutoTriggered) return;

        const dx = e.global.x - dragStartGlobalX;

        // Auto-trigger logic (Trigger at 30px)
        if (Math.abs(dx) > threshold) {
            const movingToOpposite = (panelSide === 'right' && dx < 0) || (panelSide === 'left' && dx > 0);
            if (movingToOpposite) {
                isAutoTriggered = true;
                isDragging = false;
                panelSide = panelSide === 'right' ? 'left' : 'right';
                if (onSideChange) onSideChange(panelSide);
                animateSnap();
                return;
            }
        }

        // Manual drag (proportional)
        panel.x = dragStartPanelX + dx;

        if (alternateContainer) {
            const ratio = altTravelDist / panelTravelDist;
            const baseAltX = panelSide === 'right' ? 0 : width;
            alternateContainer.x = baseAltX - (dx * ratio);
            alternateContainer.x = Math.max(0, Math.min(width, alternateContainer.x));
        }
    };

    const onPointerUp = (e) => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        if (!isDragging || isAutoTriggered) return;

        isDragging = false;
        interactableArea.cursor = 'grab';
        panel.alpha = 1.0;

        // If we let go before auto-trigger, snap back to ORIGINAL side
        animateSnap();
    };

    interactableArea.eventMode = 'static';
    interactableArea.cursor = 'grab';
    interactableArea.on('pointerdown', onPointerDown);

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', onPointerMove);
    app.stage.on('pointerup', onPointerUp);
    app.stage.on('pointerupoutside', onPointerUp);

    // Initial position
    panel.x = app.screen.width - width;
    if (alternateContainer) alternateContainer.x = 0;

    return {
        destroy: () => {
            if (holdTimer) clearTimeout(holdTimer);
            if (snapTicker) app.ticker.remove(snapTicker);
            interactableArea.off('pointerdown', onPointerDown);
            app.stage.off('pointermove', onPointerMove);
            app.stage.off('pointerup', onPointerUp);
            app.stage.off('pointerupoutside', onPointerUp);
        },
        setSide: (side) => {
            panelSide = side;
            animateSnap();
        }
    };
}
