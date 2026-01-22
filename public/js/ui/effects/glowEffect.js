import { GlowFilter } from 'pixi-filters';
import { Colors, SystemColors } from '../../core/uiStyle.js';

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
