import { Text, Sprite, Assets } from 'pixi.js';
import Card from "../../render/card";
import { Colors, Fonts } from "../../core/uiStyle";

export function createDamageUI(options) {
    return new DamageUI(options);
}

/**
 * Damage UI
 * Handles the visual representation of hull damage.
 */
export class DamageUI {
    constructor(options = {}) {
        this.card = new Card('generic', {
            label: 'damageUI',
            backgroundColor: Colors.background,
            borderColor: Colors.background,
            borderWidth: 0,
            padding: 5,
            flexDirection: 'row',
            alignItems: 'center',
            ...(options.layout || {})
        });

        // Submarine Profile Sprite
        // Default to sub_profileA as a placeholder
        const profileAsset = options.profileAsset || 'sub_profileA';
        this.profile = new Sprite(Assets.get(profileAsset));
        this.profile.layout = {
            width: 'intrinsic',
            height: 'intrinsic',
            marginRight: 10
        };
        this.profile.tint = Colors.text;
        this.card.addChild(this.profile);

        // Create health percentage label
        this.healthLabel = new Text({
            text: '100%',
            style: {
                fontFamily: Fonts.primary,
                fontSize: 16,
                fill: Colors.text,
                fontWeight: 'bold'
            }
        });

        this.card.addChild(this.healthLabel);
    }

    /**
     * Updates the UI to reflect current health and profile.
     * @param {object} healthData - Health data object.
     * @param {string} profileAsset - Optional profile asset key.
     */
    update(healthData, profileAsset) {
        if (profileAsset) {
            this.profile.texture = Assets.get(profileAsset);
        }

        if (!healthData) return;
        const percent = Math.round(healthData.percent || 0);
        this.healthLabel.text = `${percent}%`;

        const textColor = healthData.isCritical ? Colors.danger : Colors.text;
        this.healthLabel.style.fill = textColor;
        this.profile.tint = textColor; // Tints the profile along with the health for extra feedback
    }

    /**
     * Updates the submarine profile sprite texture.
     * @param {string} assetKey - The Pixi asset key for the profile.
     */
    updateProfile(assetKey) {
        if (!assetKey) return;
        try {
            this.profile.texture = Assets.get(assetKey);
        } catch (e) {
            console.warn(`[DamageUI] Failed to load profile asset: ${assetKey}`, e);
        }
    }

    mount(parent) {
        parent.addChild(this.card);
    }
}