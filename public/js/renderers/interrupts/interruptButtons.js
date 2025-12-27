import * as PIXI from "pixi.js";

/**
 * Interrupt Buttons
 * Emits semantic events only.
 * Strictly stateless renderer.
 */
export function buildInterruptButtons({ onInterrupt, availableButtons = [] } = {}) {
    const container = new PIXI.Container();
    container.label = "interrupt_buttons";

    const buttonConfigs = [
        { id: "pause", label: "PAUSE", color: 0xd97706 },
        { id: "hold", label: "HOLD", color: 0x2563eb },
        { id: "abort", label: "ABORT", color: 0xdc2626 },
    ];

    // Filter based on available buttons for the role
    const buttonsToShow = buttonConfigs.filter(config => availableButtons.includes(config.id));

    let x = 20;

    for (const btnConfig of buttonsToShow) {
        const button = createButton(btnConfig);
        button.position.set(x, 40);
        container.addChild(button);
        x += 130;

        button.on("pointertap", () => {
            onInterrupt?.(btnConfig.id);
        });
    }

    return {
        container,
    };
}

function createButton({ id, label, color }) {
    const container = new PIXI.Container();
    container.eventMode = "static";
    container.cursor = "pointer";
    container.label = `interrupt_btn_${id}`;

    const bg = new PIXI.Graphics()
        .roundRect(0, 0, 110, 40, 8)
        .fill({ color });

    const text = new PIXI.Text({
        text: label,
        style: {
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            fill: 0xffffff,
            fontWeight: "600",
            align: "center",
        },
    });

    text.anchor.set(0.5);
    text.position.set(55, 20);

    // Hover effect
    container.on("pointerover", () => {
        bg.alpha = 0.85;
    });

    container.on("pointerout", () => {
        bg.alpha = 1.0;
    });

    container.addChild(bg, text);
    return container;
}
