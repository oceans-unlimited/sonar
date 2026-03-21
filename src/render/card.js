import { LayoutContainer } from '@pixi/layout/components';
import { cardPatterns } from './layouts';
import { cascadeColor } from './util/colorOps';
import { Sprite, Text, Assets, Container } from 'pixi.js';
import { SYSTEM_ASSETS, Fonts, Colors, Alphas } from '../core/uiStyle.js';
import { createButtonFromDef } from './button';

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

/**
 * Player Nameplate Card
 * Patterned after the nameplate demo in testScene.js.
 */
export class PlayerNamePlate extends Card {
    constructor(playerConfig = {}) {
        super('nameplate', {
            label: `player_card_${playerConfig.id || 'empty'}`,
            backgroundColor: Colors.background,
            borderColor: Colors.border,
            borderWidth: 1,
            gap: 10
        });

        this.playerId = playerConfig.id;
        this.playerName = playerConfig.name || 'Unknown';

        // 1. Name Text (Left Side, pushes others right)
        this.nameText = new Text({
            text: this.playerName.toUpperCase(),
            style: {
                fontFamily: Fonts.primary,
                fontSize: 28,
                fontWeight: 'bold',
                fill: Colors.text
            }
        });
        this.nameText.label = 'nameText';
        this.nameText.layout = { maxWidth: '87%' };
        this.addChild(this.nameText);

        // 2. Ready Indicator (thumb button)
        this.readyIcon = createButtonFromDef({
            asset: 'thumb',
            color: Colors.dim,
            profile: 'basic',
            canonicalLabel: 'readyToggle',
            height: 30,
        });
        this.readyIcon.layout = { position: 'absolute', right: 0, top: 0 };
        this.readyIcon.visible = false;
        this.addChild(this.readyIcon);

        // 3. Vacate Button (circuit tag)
        this.vacateBtn = createButtonFromDef({
            asset: 'grid_tag',
            color: 0xFFFFFF,
            profile: 'tag',
            canonicalLabel: 'vacate',
            height: 22,
        });
        this.vacateBtn.setAlpha(Alphas.overlay);
        this.vacateBtn.layout = { position: 'absolute', right: 0, bottom: 0 };
        this.vacateBtn.visible = false;
        this.addChild(this.vacateBtn);
    }

    setReady(isReady) {
        this.readyIcon.visible = true;
        this.readyIcon.setTint(isReady ? Colors.success : Colors.dim);
    }

    setVacateVisible(isVisible) {
        this.vacateBtn.visible = isVisible;
    }

    updateStyle(isAssigned, subColor, isSelf, roleColor = null) {
        if (!isAssigned) {
            this.setBorderColor(Colors.border);
            this.setTint(Colors.background);
            this.nameText.style.fill = Colors.text;
            this.readyIcon.visible = false;
            this.vacateBtn.visible = false;
        } else {
            if (isSelf) {
                // Self: Sub color solid background
                this.setBorderColor(subColor);
                this.setTint(subColor);
                // Inherit role color if assigned to a sub
                this.nameText.style.fill = roleColor || Colors.background;
                this.nameText.style.fontWeight = 'bold';
            } else {
                // Other: Sub color border
                this.setBorderColor(subColor);
                this.setTint(Colors.background);
                // Inherit role color if assigned to a sub; default to subColor if no roleColor
                this.nameText.style.fill = roleColor || subColor;
                this.nameText.style.fontWeight = 'normal';
            }
        }
    }
}
