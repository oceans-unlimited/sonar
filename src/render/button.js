import { Container, Sprite, Graphics, Text, Assets, NineSliceSprite } from 'pixi.js';
import { LayoutContainer } from '@pixi/layout/components';
import { scaleToHeight, scaleByMinDimension } from './util/scaling'
import { Fonts, Colors } from '../core/uiStyle';
import { buttonPatterns } from './layouts';

const PROFILES = {
    basic: { overlay: true },
    frame: { frameTexture: 'buttonFrame', overlay: true, slice: 20 },
    circuit: {
        frameTexture: 'circuitFrame',
        overlay: true,
        tagTexture: 'gridTag',
        frameColor: 0xcccccc,
        tagColor: 0xcccccc,
        slice: 25
    },
    reactor: { tagTexture: 'reactorTag' },
    info: { overlay: true },
    text: { textOnly: true }
};

export default class Button extends Container {
    /**
     * @param {Object} config - The button definition
     * @param {string} config.asset - The background texture alias
     * @param {number} config.color - Hex color value
     * @param {string} [config.profile='basic'] - Visual style profile
     * @param {string} [config.textLabel] - Text label
     * @param {boolean} [config.textOnly=false] - If true, background is hidden
     * @param {string} [config.canonicalLabel='system'] - Canonical label for the button
     */
    constructor(config = {}) {
        super();

        const {
            asset,
            color = 0xFFFFFF,
            profile = 'basic',
            textLabel,
            textOnly = false,
            canonicalLabel = 'system'
        } = config;

        this.profile = profile.toLowerCase();
        const profileConfig = PROFILES[this.profile];
        const layoutPattern = buttonPatterns[this.profile];
        this.interactive = true;
        this.interactiveChildren = true;
        this.cursor = 'pointer';

        this.layout = layoutPattern ? {
            minWidth: 44,
            minHeight: 44,
            ...layoutPattern,
            alignItems: 'center',
            justifyContent: 'center'
        } : { width: 'auto', height: 'auto', minWidth: 44, minHeight: 44 };
        this.label = canonicalLabel;
        this.initialColor = color;

        // 1. Content Container - This will host icons/background and respect parent padding
        this.content = new Container();
        this.content.label = 'buttonContent';
        this.content.layout = {
            width: this.profile === 'text' ? 'auto' : '100%',
            height: this.profile === 'text' ? 'auto' : '100%',
            justifyContent: 'center',
            alignItems: 'center'
        };
        this.addChild(this.content);

        // 2. Chrome - Overlays and Frames that ignore internal padding
        if (profileConfig && profileConfig.overlay) {
            this.addOverlay(color);
        }

        if (profileConfig && profileConfig.frameTexture) {
            const fColor = config.frameColor ?? profileConfig.frameColor ?? color;
            this.addNineSliceFrame(profileConfig.frameTexture, fColor, profileConfig.slice);
        }

        if (profileConfig && profileConfig.tagTexture) {
            const tColor = config.tagColor ?? profileConfig.tagColor ?? color;
            this.addTag(profileConfig.tagTexture, tColor);
        }

        // 3. Components
        this._setupBackground(asset, color, textOnly || (profileConfig && profileConfig.textOnly));

        if (textLabel) {
            this.setTextLabel(textLabel);
        }

        // 4. Interaction — Set to true so internal children (background/frame) provide the hit area
        this.eventMode = 'static';
        this.interactiveChildren = true;
    }

    _setupBackground(asset, color, isHidden) {
        if (isHidden) return;

        let texture = asset ? Assets.cache.get(asset) : Assets.cache.get('filled_box');

        const background = new Sprite(texture);
        background.label = 'btnBackground';
        background.tint = color;

        background.layout = {
            isLeaf: true,
            height: '100%',
            objectFit: 'contain'
        };

        this.content.addChild(background);
    }

    addOverlay(color) {
        // Overlay fits the button fits 100% via absolute positioning
        const overlay = new Graphics({ label: 'btnOverlay' })
            .roundRect(-32, -32, 64, 64, 12) // Base size, layout will stretch
            .fill({
                color: color,
                alpha: 0.3,
            });

        overlay.layout = {
            isLeaf: true,
            position: 'absolute',
            width: '100%',
            height: '100%',
        };

        overlay.visible = false;
        this.addChild(overlay);
        return this;
    }

    addNineSliceFrame(assetAlias, color, sliceSize = 20) {
        const texture = Assets.cache.get(assetAlias);
        if (!texture) {
            console.warn(`[Button] Frame texture not found: ${assetAlias}`);
            return this;
        }

        const frame = new NineSliceSprite({
            texture,
            leftWidth: sliceSize,
            topHeight: sliceSize,
            rightWidth: sliceSize,
            bottomHeight: sliceSize
        });
        frame.label = 'btnFrame';
        frame.tint = color;

        // Frame slightly overlaps the edges
        frame.layout = {
            position: 'absolute',
            width: '100%',
            height: '100%',
        };

        this.addChild(frame);
        return this;
    }

    addTag(assetAlias, color) {
        const texture = Assets.cache.get(assetAlias);
        if (!texture) return this;

        const tag = new Sprite(texture);
        tag.label = 'btnTag';
        tag.tint = color;
        tag.visible = false;

        tag.layout = {
            position: 'absolute',
            right: 5,
            bottom: 5
        };

        this.addChild(tag);
        return this;
    }

    /**
     * Sets or updates the text label on the button.
     * @param {string} text - The text to display.
     * @param {object} style - Optional PixiJS text style overrides.
     */
    setTextLabel(text, style = {}) {
        let textLabel = this.content.getChildByLabel('btnLabel');

        if (!textLabel) {
            const textStyle = {
                fontFamily: Fonts.primary,
                fontSize: 20,
                fill: Colors.text,
                fontVariant: "small-caps",
                align: 'center',
                ...style
            };

            textLabel = new Text({
                text: text,
                style: textStyle,
                label: 'btnLabel'
            });
            textLabel.anchor.set(0.5);

            // Baseline layout for text labels
            textLabel.layout = {
                isLeaf: true,
                objectFit: 'contain',
                position: 'absolute',
            };

            this.content.addChild(textLabel);
        } else {
            textLabel.text = text;
            if (Object.keys(style).length > 0) {
                textLabel.style = { ...textLabel.style, ...style };
            }
        }

        return this;
    }

    /**
     * Toggles visibility of the background graphic.
     * Useful for 'text-only' buttons that still need a background for hit-area.
     */
    setBackgroundVisible(visible) {
        const bg = this.content.getChildByLabel('btnBackground');
        if (bg) bg.visible = visible;
        return this;
    }

    setScale(scale) {
        this.scale.set(scale);
        return this;
    }

    /**
     * Set the background texture. 
     * @param {string|import('pixi.js').Texture} asset - The texture alias or Texture object.
     */
    setAsset(asset) {
        let texture = null;
        if (typeof asset === 'string') {
            texture = Assets.cache.get(asset);
        } else {
            texture = asset;
        }

        if (texture) {
            const bg = this.content.getChildByLabel('btnBackground');
            if (bg) {
                bg.texture = texture;
            }
        } else {
            console.warn(`[Button] Texture not found for asset: ${asset}`);
        }
        return this;
    }

    showTag() {
        const tag = this.getChildByLabel('btnTag');
        if (tag) tag.visible = true;
        return this;
    }

    hideTag() {
        const tag = this.getChildByLabel('btnTag');
        if (tag) tag.visible = false;
        return this;
    }

    setTint(color) {
        const bg = this.content.getChildByLabel('btnBackground');
        if (bg) bg.tint = color;

        const frame = this.getChildByLabel('btnFrame');
        if (frame) frame.tint = color;

        const tag = this.getChildByLabel('btnTag');
        if (tag) tag.tint = color;
    }

    destroy(options) {
        super.destroy(options);
    }
}

/**
 * Factory wrapper for Button class.
 * Ensures consistent object creation using the profile-driven architecture.
 */
export function createButtonFromDef(config) {
    return new Button(config);
}
