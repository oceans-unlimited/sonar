import { LayoutContainer } from '@pixi/layout/components';
import { cardPatterns } from './layouts';
import { cascadeColor } from './util/colorOps';
import { Sprite, Text, Assets } from 'pixi.js';
import { SYSTEM_ASSETS, Fonts } from '../core/uiStyle.js';

/**
 * Card is a flexible LayoutContainer for grouping related UI elements.
 * Extends LayoutContainer to handle auto-layout of children.
 */
export default class Card extends LayoutContainer {
    constructor(pattern, config = {}) {
        super();

        const {
            label,
            backgroundColor = 0xFFFFFF,
            borderColor = 0xFFFFFF,
            borderWidth = 3,
            borderRadius = 8,
            padding = 10,
            gap = 0
        } = config;

        this.label = label;

        // Configure layout behavior
        this.layout = {
            ...(cardPatterns[pattern] || cardPatterns.generic),
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius,
            padding,
            gap
        };

        // Cards are non-interactive by default, but allow children to be
        this.interactive = false;
        this.interactiveChildren = true;
    }

    /**
     * Updates the background color (cascades where appropriate).
     * Follows COLOR_CONTROL_PLAN.md.
     */
    setTint(color) {
        this.layout = { backgroundColor: color };
        // Cascade to specific children if needed (e.g., icons or specific labels)
        cascadeColor(this, color);
    }

    /**
     * Updates the border color.
     */
    setBorderColor(color) {
        this.layout = { borderColor: color };
    }

    /**
     * Set the background alpha.
     */
    setAlpha(alpha) {
        if (this.background) {
            this.background.alpha = alpha;
        }
    }
}

/**
 * Visual card representing a submarine system status.
 * Switches between Online (filled) and Offline (empty) states.
 */
export class SystemStatusCard extends Card {
    constructor(systemName) {
        const sysConfig = SYSTEM_ASSETS[systemName.toLowerCase()] || SYSTEM_ASSETS.empty;
        super('nameplate', {
            label: `status_${systemName}`,
            backgroundColor: sysConfig.color,
            borderColor: sysConfig.color,
            borderWidth: 2,
            padding: 10,
            gap: 15
        });

        this.systemColor = sysConfig.color;

        // Icon
        const texture = Assets.cache.get(sysConfig.asset);
        this.icon = new Sprite(texture);
        this.icon.tint = 0x000000;
        this.icon.layout = {
            width: 40,
            height: 40,
        };
        this.addChild(this.icon);

        // Status Text
        this.statusLabel = new Text({
            text: 'ONLINE',
            style: {
                fontFamily: Fonts.header,
                fontSize: 18,
                fill: 0x000000,
                fontWeight: 'bold'
            },
            layout: {
                marginLeft: 10
            }
        });
        this.addChild(this.statusLabel);
    }

    /**
     * Updates the visual state of the card based on system availability.
     * @param {boolean} isOnline - True if the system is fully operational.
     */
    updateStatus(isOnline) {
        if (isOnline) {
            this.setAlpha(1);
            this.statusLabel.text = 'ONLINE';
            this.statusLabel.style.fill = 0x000000;
            this.icon.tint = 0x000000;
        } else {
            this.setAlpha(0);
            this.statusLabel.text = 'OFFLINE';
            this.statusLabel.style.fill = this.systemColor;
            this.icon.tint = this.systemColor;
        }
    }
}
