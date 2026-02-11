import * as PIXI from "pixi.js";
import { Font, Colors } from "../core/uiStyle.js";

/**
 * Creates a standardized sprite-based button container.
 * Supports dynamic updates via an exposed .update() method.
 * 
 * @param {object} assets - The assets object containing textures.
 * @param {string} label - The text label for the button.
 * @param {object} config - Configuration options.
 * @param {number} [config.x=0] - X position.
 * @param {number} [config.y=0] - Y position.
 * @param {string} [config.system] - System name for color coding/icon lookup.
 * @param {number} [config.scale=1] - Scale of the button.
 * @param {PIXI.Texture} [config.texture] - Explicit texture to use.
 * @returns {PIXI.Container} The button container with .update() method.
 */
export function createButton(assets, label, layout = {}, sprite) {
    const button = new PIXI.Container({
        layout: {
            width:
    });

    
    // Internal references
    const sprite = new PIXI.Sprite();
    sprite.anchor.set(0.5);
    button.addChild(sprite);
    button.bgSprite = sprite;

    const textNode = new PIXI.Text({
        text: '',
        style: {
            fontFamily: Font.family,
            fontSize: 16,
            fill: Colors.text,
            align: 'center',
            letterSpacing: 2
        }
    });
    textNode.anchor.set(0.5);
    button.addChild(textNode);
    button.labelNode = textNode;

    // --- Update Method ---
    // Allows the controller to modify the button after creation (e.g. converting a placeholder)
    button.update = (newConfig = {}) => {
        // Merge current config with new config
        // (In a real app, you might want to store the full state, but here we just apply updates)
        const {
            x, y, scale,
            system,
            texture,
            label: newLabel,
            visible
        } = newConfig;

        // 1. Transform
        if (x !== undefined) button.x = x;
        if (y !== undefined) button.y = y;
        if (scale !== undefined) button.scale.set(scale);
        if (visible !== undefined) button.visible = visible;

        // 2. Metadata
        if (system !== undefined) button.system = system;

        // 3. Texture Resolution
        // Priority: Explicit Texture -> System Asset -> Fallback (Placeholder)
        let targetTexture = texture;
        if (!targetTexture && button.system && assets[button.system]) {
            targetTexture = assets[button.system];
        }
        if (!targetTexture) {
            targetTexture = assets.button || assets.filled_box || PIXI.Texture.WHITE;
        }
        
        if (sprite.texture !== targetTexture) {
            sprite.texture = targetTexture;
        }

        // 4. Label
        const txt = newLabel !== undefined ? newLabel : label;
        if (txt !== undefined && txt !== null) {
            textNode.text = txt;
        }
    };

    // Initialize with provided config
    button.update(config);

    return button;
}
