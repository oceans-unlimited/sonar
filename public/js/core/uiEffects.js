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
