import * as PIXI from "pixi.js";
import { Colors, SystemColors } from '../../core/uiStyle.js';
import { applyGlowEffect } from '../effects/glowEffect.js';

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
