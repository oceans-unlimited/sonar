import { LayoutContainer } from '@pixi/layout/components';
import { Container, Sprite, Text } from 'pixi.js';
import { panelPatterns } from './layouts';
import { Assets, TextStyle } from 'pixi.js';
import { MapUtils } from '../feature/map/mapUtils.js';
import { Fonts, Colors } from '../core/uiStyle.js';

/**
 * Panel is a LayoutContainer that knows how to configure its own 'layout' property
 * and hold button blocks or other features and display objects. 
 */

export default class Panel extends LayoutContainer {
    constructor(pattern, config = {}) {
        super();

        const {
            label,          // Selector ID (canonical)
            headerText,
            backgroundColor = 0xFFFFFF,
            borderColor = 0xFFFFFF,
            borderWidth = 6,
            borderRadius = 12,
            showTab = false
        } = config;

        this.label = label;
        this.headerText = headerText;
        this.showTab = showTab;
        this.tab = null;

        this.layout = {
            ...(panelPatterns[pattern]),
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius
        };
        this.interactive = false;

        // Folder style tab
        this.tab = this.buildTab(this.headerText);
        if (this.tab) {
            this.tab.visible = this.showTab;
            if (this.panelTab) this.panelTab.tint = borderColor;
        }
    }

    /**
     * Updates the background color of the panel.
     * @param {number} color - Hex color value
     */
    setTint(color) {
        this.layout = { backgroundColor: color };
    }

    /**
     * Updates the border color of the panel.
     * @param {number} color - Hex color value
     */
    setBorderColor(color) {
        this.layout = { borderColor: color };
        if (this.panelTab) {
            this.panelTab.tint = color;
        }
    }

    /**
     * Updates the alpha of the panel background.
     * @param {number} alpha - Alpha value (0-1)
     */
    setAlpha(alpha) {
        if (this.background) this.background.alpha = alpha;
    }

    buildTab(headerText) {
        // Wrapper container for the tab elements
        const tabWrapper = new Container({
            layout: {
                position: 'absolute',
                right: 5,
                top: -25,
                width: 'auto',
                height: 'auto'
            }
        });
        tabWrapper.label = "tabWrapper";
        this.addChild(tabWrapper);

        this.panelTab = new Sprite({
            texture: Assets.get('panelTab'),
            layout: {
                width: '100%',
                height: '100%',
                position: 'absolute',
                objectFit: 'fill'
            }
        });
        this.panelTab.label = "panelTab";
        tabWrapper.addChild(this.panelTab);

        if (headerText) {
            const style = new TextStyle({
                fontFamily: Fonts.header,
                fontSize: 20, // Effective 14px after 0.5 scale
                fill: Colors.background,
                fontVariant: 'small-caps',
                align: 'right',
            });

            this.tabLabel = new Text({
                text: headerText,
                style,
                layout: {
                    width: 'intrinsic',
                    height: 'intrinsic',
                    marginRight: 5,
                    marginLeft: 15
                }
            });
            this.tabLabel.label = "tabLabel";

            tabWrapper.addChild(this.tabLabel);
        }

        return tabWrapper;
    }
}
