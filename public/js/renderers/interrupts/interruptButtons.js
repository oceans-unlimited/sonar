import * as PIXI from "pixi.js";
import { createButtonStateManager } from "../../ui/behaviors/buttonStateManager.js";
import { Colors, Font } from "../../core/uiStyle.js";


/**
 * Interrupt Buttons
 * Emits semantic events only.
 * Strictly stateless renderer.
 */
export function buildInterruptButtons({ app, assets, onInterrupt, availableButtons = [], buttonOverrides = {} } = {}) {
    const container = new PIXI.Container();
    container.label = "interrupt_buttons";

    const defaultConfigs = [
        { id: "pause", label: "PAUSE", color: 0xd97706 },
        { id: "hold", label: "HOLD", color: 0x2563eb },
        { id: "abort", label: "ABORT", color: 0xdc2626 },
        { id: "surrender", label: "SURRENDER", color: 0x991b1b },
        { id: "submit", label: "SUBMIT", color: 0x059669 },
        { id: "ready", label: "READY", color: 0x059669 },
    ];

    const buttonsToShow = defaultConfigs
        .filter(config => availableButtons.includes(config.id))
        .map(config => ({
            ...config,
            ...(buttonOverrides[config.id] || {})
        }));

    let x = 20;

    for (const btnConfig of buttonsToShow) {
        const button = createButton(btnConfig, assets);
        button.position.set(x, 40);
        container.addChild(button);

        const stateManager = createButtonStateManager(button, app, assets.disabled);
        stateManager.setActive(); // Initial state: active/ready

        // Apply custom color if provided in tint
        if (btnConfig.color) {
            button.children.forEach(c => {
                if (c instanceof PIXI.Graphics) {
                    // If using graphics bg
                }
            });
        }

        button.on("pointertap", () => {
            onInterrupt?.(btnConfig.id);
        });

        x += 130;
    }

    return {
        container,
    };
}

function createButton({ id, label, color }, assets) {
    const container = new PIXI.Container();
    container.eventMode = "static";
    container.cursor = "pointer";
    container.label = `interrupt_btn_${id}`;
    container.system = 'detection'; // For glow color lookup in manager

    let bg;
    if (assets.button) {
        bg = new PIXI.Sprite(assets.button);
        bg.anchor.set(0.5);
        bg.width = 110;
        bg.height = 40;
        bg.position.set(55, 20);
        bg.tint = color || Colors.text;
    } else {
        bg = new PIXI.Graphics()
            .roundRect(0, 0, 110, 40, 8)
            .fill({ color: color || 0x333333 });
    }

    const text = new PIXI.Text({
        text: label,
        style: {
            fontFamily: Font.family,
            fontSize: 14,
            fill: 0xffffff,
            fontWeight: "600",
            align: "center",
        },
    });

    text.anchor.set(0.5);
    text.position.set(55, 20);

    container.addChild(bg, text);
    return container;
}

