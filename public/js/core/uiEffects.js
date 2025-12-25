// Creates reusable Pixi layers for noise, scanlines, flicker, glow filters, etc.

import * as PIXI from "pixi.js";
import { GlowFilter } from 'pixi-filters';
import { Colors, SystemColors } from './uiStyle.js';

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

export function applyFlickerEffect(app, targets, amplitude = 0.02, frequency = 10) {
    const flickerCallback = () => {
        const flicker = 1 + Math.sin(app.ticker.lastTime * frequency * 0.001) * amplitude;
        let anyAlive = false;
        for (const obj of targets) {
            if (obj && !obj.destroyed) {
                obj.alpha = flicker;
                anyAlive = true;
            }
        }
        if (!anyAlive && targets.length > 0) {
            app.ticker.remove(flickerCallback);
        }
    };
    app.ticker.add(flickerCallback);

    return flickerCallback;
}

export function applyTintColor(target, colorOrName) {
    let color = null;
    if (typeof colorOrName === 'number') {
        color = colorOrName;
    } else if (typeof colorOrName === 'string') {
        const key = colorOrName.toLowerCase();
        if (SystemColors[key] !== undefined) color = SystemColors[key];
        else if (Colors[key] !== undefined) color = Colors[key];
        else if (/^#?[0-9a-f]{6}$/i.test(colorOrName)) {
            const hex = colorOrName.startsWith('#') ? colorOrName.slice(1) : colorOrName;
            color = parseInt(hex, 16);
        } else {
            color = Colors.text; // fallback
        }
    } else {
        color = Colors.text; // fallback default
    }

    target.tint = color;

    const remove = () => {
        target.tint = 0xFFFFFF;
    };

    return {
        remove,
    };
}

export function applyGlowEffect(target, app, colorOrName) {
    // Resolve colorOrName which can be:
    // - numeric 0xRRGGBB
    // - a system name like 'stealth'|'weapons'|'detection'|'reactor'
    // - a Colors key like 'text' or 'roleCaptain'
    // - a hex string like '#ff0000'
    let color = null;
    if (typeof colorOrName === 'number') {
        color = colorOrName;
    } else if (typeof colorOrName === 'string') {
        const key = colorOrName.toLowerCase();
        if (SystemColors[key] !== undefined) color = SystemColors[key];
        else if (Colors[key] !== undefined) color = Colors[key];
        else if (/^#?[0-9a-f]{6}$/i.test(colorOrName)) {
            const hex = colorOrName.startsWith('#') ? colorOrName.slice(1) : colorOrName;
            color = parseInt(hex, 16);
        } else {
            color = Colors.text; // fallback
        }
    } else {
        color = Colors.text; // fallback default
    }

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
            glow.outerStrength = 1 + Math.sin(time) * 1.5;
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

export function createButtonStateManager(button, app, disabledTexture) {
    if (!button) {
        console.warn("createButtonStateManager called without a button object");
        return {
            setActive: () => { },
            setDisabled: () => { },
            setPushed: () => { },
            setNeutral: () => { },
            isPushed: () => false,
        };
    }
    // Resolve glow color: prefer a system name on the button (e.g. button.system)
    // falling back to Colors.text.
    let glowColor = Colors.text;
    try {
        const sys = (button && (button.system || button.systemName));
        if (sys) {
            const key = String(sys).toLowerCase();
            if (SystemColors[key] !== undefined) glowColor = SystemColors[key];
            else if (Colors[key] !== undefined) glowColor = Colors[key];
        }
    } catch (e) {
        // ignore and keep default
    }

    const glow = applyGlowEffect(button, app, glowColor);
    glow.off();

    const disabledOverlay = new PIXI.Sprite(disabledTexture);
    disabledOverlay.anchor.set(0.5);
    // Position overlay at the button's local center. Buttons are created with
    // anchor.set(0.5) so (0,0) is the visual center — use that instead of
    // width/2,height/2 which incorrectly offsets when anchor is centered.
    disabledOverlay.position.set(0, 0);
    disabledOverlay.visible = false;
    disabledOverlay.eventMode = 'none'; // Ensure clicks pass through
    button.addChild(disabledOverlay);
    button.disabledOverlay = disabledOverlay;

    let isPushed = false;

    const setActive = () => {
        isPushed = false;
        button.alpha = 1;
        glow.steadyOn(1); // Slight glow
        disabledOverlay.visible = false;
        button.eventMode = 'static';
        button.cursor = 'pointer';
    };

    const setDisabled = () => {
        isPushed = false;
        button.alpha = 0.5;
        glow.off();
        disabledOverlay.visible = false;
        button.eventMode = 'none';
        button.cursor = 'default';
    };

    const setPushed = () => {
        isPushed = true;
        button.alpha = 0.3;
        glow.off();
        disabledOverlay.visible = true;
        button.eventMode = 'none';
        button.cursor = 'default';
    };

    const setNeutral = () => {
        isPushed = false;
        button.alpha = 1.0;
        glow.off();
        disabledOverlay.visible = false;
        button.eventMode = 'none';
        button.cursor = 'default';
    };

    // Initial state
    setDisabled();

    return {
        setActive,
        setDisabled,
        setPushed,
        setNeutral,
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
                    // Note: stepX is the change in panel.x. 
                    // We need to move the alt container in the OPPOSITE direction.
                    const altStep = -stepX * ratio;
                    alternateContainer.x += altStep;
                    // Clamp alternateContainer to screen bounds [0, width]
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
