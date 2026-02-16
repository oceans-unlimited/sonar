import { Container, Sprite, Graphics } from 'pixi.js';
import { Assets } from 'pixi.js';
import { scaleToHeight } from './util/scaling'

export default class Button extends Container {
    constructor(bgIcon, color) {
        super();

        this.layout = {
            // height: 'intrinsic',
            // width: 'intrinsic',
            isLeaf: true,
            justifyContent: 'center',
            alignItems: 'center'
        }
        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.overlay = null;
        this.frame = null;
        this.tag = null;
        this.filters = [];

        // 1. Background Sizing (Manual)
        this.background = new Sprite(bgIcon);
        this.background.anchor.set(0.5);
        this.position.set(0.5, 0.5);
        scaleToHeight(this.background, 65);

        this.background.tint = color;
        this.initialColor = color;

        this.addChild(this.background);
    }

    updateSizeToFitChildren() {
        this.getLocalBounds();
        const b = this.getLocalBounds();
        this.setSize(b.width, b.height);
        if (this.overlay) {
            this.overlay.width = b.width;
            this.overlay.height = b.height;
        }
    }

    addOverlay(color = this.background.tint) {
        this.getLocalBounds();
        // Draw the overlay to match the container size exactly
        this.overlay = new Graphics()
            .roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10)
            .fill({
                color: color,
                alpha: 0.5,
            });

        this.overlay.visible = false;
        this.addChild(this.overlay);
        this.updateSizeToFitChildren();

        return this;
    }

    addTextureFrame(frameTexture, frameColor = this.background.tint) {
        if (!this.frame) {
            this.frame = new Sprite(frameTexture);
            this.frame.anchor.set(0.5);
            scaleToHeight(this.frame, 70);

            this.addChild(this.frame);
            this.background.scale.set(0.95);
            this.updateSizeToFitChildren();
        }

        this.frame.tint = frameColor;
        return this;
    }

    addTag(
        tagTexture,
        tagColor = this.frame?.tint || this.background.tint
    ) {
        if (!this.tag) {
            this.tag = new Sprite(tagTexture);

            // Position manually at bottom-right
            // Small offset to tuck it in
            this.tag.anchor.set(1, 1);
            this.tag.x = this.width / 2;
            this.tag.y = this.height / 2;

            this.tag.tint = tagColor;
            this.tag.visible = false;
            this.addChild(this.tag);
            this.updateSizeToFitChildren();
        }
        return this;
    }

    setPosition(x, y) {
        this.position.set(x, y);
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
            this.background.texture = texture;
            // Ensure scaling is consistent with constructor
            scaleToHeight(this.background, 65);
        } else {
            console.warn(`[Button] Texture not found for asset: ${asset}`);
        }
        return this;
    }

    showTag() {
        if (this.tag) this.tag.visible = true;
        return this;
    }

    hideTag() {
        if (this.tag) this.tag.visible = false;
        return this;
    }

    setTint(color) {
        this.background.tint = color;
        if (this.frame) this.frame.tint = color;
        // Note: Overlay and Tag usually have distinct colors or alphas, 
        // so we don't automatically override them unless needed.
    }

    destroy(options) {
        this.overlay = null;
        this.frame = null;
        this.tag = null;
        super.destroy(options);
    }
}

const PROFILE_CONFIG = {
    basic: {},
    frame: { frameTexture: 'buttonFrame', overlay: true },
    circuit: {
        frameTexture: 'circuitFrame',
        overlay: true,
        tagTexture: 'gridTag',
        frameColor: 0xcccccc,
        tagColor: 0xcccccc
    },
    reactor: { tagTexture: 'reactorTag' },
    info: { overlay: true }
};

export function createButtonFromDef(btnDef) {
    const { asset, color, profile = 'basic' } = btnDef;

    // Resolve texture: check asset in cache
    let bgIcon = null;

    if (typeof asset === 'string') {
        bgIcon = Assets.cache.get(asset);
    } else if (asset) {
        bgIcon = asset;
    }

    const button = new Button(bgIcon, color);

    if (!bgIcon) {
        console.error(`[Button] CRITICAL: background texture not found for asset: ${asset}.`);
    }

    const config = PROFILE_CONFIG[profile.toLowerCase()] || PROFILE_CONFIG.basic;

    if (config.overlay) {
        button.addOverlay(color);
    }

    if (config.frameTexture) {
        let fTexture = btnDef.frameTexture || Assets.cache.get(config.frameTexture);
        let fColor = color;
        if (btnDef.frameColor !== undefined) {
            fColor = btnDef.frameColor;
        } else if (config.frameColor !== undefined) {
            fColor = config.frameColor;
        }
        if (fTexture) button.addTextureFrame(fTexture, fColor);
    }

    if (config.tagTexture) {
        let tTexture = btnDef.tagTexture || Assets.cache.get(config.tagTexture);
        let tColor = color;
        if (btnDef.tagColor !== undefined) {
            tColor = btnDef.tagColor;
        } else if (config.tagColor !== undefined) {
            tColor = config.tagColor;
        }
        if (tTexture) button.addTag(tTexture, tColor);
    }

    // Assign Canonical Label based on Profile/Role
    if (profile === 'reactor') {
        button.label = 'reactor_btn'; // Canonical
    } else if (profile === 'circuit' || profile === 'frame') {
        button.label = 'system'; // Canonical for general systems
    } else {
        button.label = 'system'; // Default fallback
    }

    return button;
}
