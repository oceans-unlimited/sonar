import { LayoutContainer } from '@pixi/layout/components';
import { Sprite, Text, Assets } from 'pixi.js';
import { Fonts, Colors } from '../core/uiStyle.js';

/**
 * SubmarineProfile Component
 * Displays the submarine's hull profile icon and damage level percentage.
 * Simplified version with no gauge, only color-coded status.
 */
export default class SubmarineProfile extends LayoutContainer {
    constructor(config = {}) {
        super();

        const {
            subType = 'sub_profileA',
            initialHealth = 4
        } = config;

        this.label = 'submarineProfile';
        this.layout = {
            width: 'intrinsic',
            height: 'intrinsic',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
        };

        // 1. Submarine Image
        this.subIcon = new Sprite(Assets.cache.get(subType));
        this.subIcon.anchor.set(0.5);
        this.subIcon.layout = {
            width: 140,
            height: 48
        };
        this.addChild(this.subIcon);

        // 2. Health Info Row
        this.infoRow = new LayoutContainer();
        this.infoRow.layout = {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 5,
            paddingRight: 5
        };
        this.addChild(this.infoRow);

        this.healthPercent = new Text({
            text: '100%',
            style: {
                fontFamily: Fonts.primary,
                fontSize: 14,
                fill: Colors.text,
                fontWeight: 'bold'
            }
        });
        this.infoRow.addChild(this.healthPercent);

        this.statusDescriptor = new Text({
            text: 'FULL',
            style: {
                fontFamily: Fonts.header,
                fontSize: 11,
                fill: Colors.text,
                fontWeight: 'bold'
            }
        });
        this.infoRow.addChild(this.statusDescriptor);

        this.update(initialHealth);
    }

    /**
     * Updates the visual state of the component based on health.
     * @param {number} health - Current health (0-4)
     */
    update(health) {
        const percent = Math.round((health / 4) * 100);
        this.healthPercent.text = `${percent}%`;

        let color;
        let descriptor;

        if (health >= 4) {
            color = Colors.text; // Typical green-ish
            descriptor = 'STATUS: NOMINAL';
        } else if (health >= 3) {
            color = 0xAAFF00; // Light green/Yellow
            descriptor = 'STATUS: DAMAGED';
        } else if (health >= 2) {
            color = 0xFFAA00; // Orange
            descriptor = 'STATUS: CRITICAL';
        } else {
            color = 0xFF0000; // Red
            descriptor = 'HULL FAILURE IMMINENT';
        }

        // Apply colors
        this.subIcon.tint = color;
        this.healthPercent.style.fill = color;
        this.statusDescriptor.text = descriptor;
        this.statusDescriptor.style.fill = color;
    }
}

