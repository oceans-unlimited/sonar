import * as PIXI from 'pixi.js';
import { MapMenuConfigs, getMenuConfig } from './mapMenuConfig.js';
import { MapConstants } from './mapConstants.js';

/**
 * Map Menu Renderer
 * Renders intent-driven menus adjacent to selected squares.
 * Uses button.svg and filled_box.svg assets for menu items.
 */
export class MapMenuRenderer {
    constructor(renderer, assets) {
        this.renderer = renderer;
        this.assets = assets;
        this.container = new PIXI.Container();
        this.currentMenu = null;
        this.isVisible = false;

        // Menu styling
        this.menuPadding = 8;
        this.buttonHeight = 24;
        this.buttonSpacing = 4;
        this.menuWidth = 120;

        // Initialize
        this.renderer.container.addChild(this.container);
        this.hide();
    }

    /**
     * Shows intent menu at given anchor point
     * @param {object} anchor - {x, y} screen coordinates
     * @param {object} squareData - Square data from MapUtils
     * @param {object} context - Context (current intent, etc.)
     */
    showIntentMenu(anchor, squareData, context = {}) {
        this.showMenu('intent', anchor, squareData, context);
    }

    /**
     * Shows context menu at given anchor point
     * @param {object} anchor - {x, y} screen coordinates
     * @param {object} squareData - Square data from MapUtils
     * @param {object} context - Context (current intent, etc.)
     */
    showContextMenu(anchor, squareData, context = {}) {
        this.showMenu('context', anchor, squareData, context);
    }

    /**
     * Shows menu of specified type
     */
    showMenu(menuType, anchor, squareData, context = {}) {
        this.clearMenu();

        const config = getMenuConfig(menuType, squareData, context);
        if (!config || config.options.length === 0) {
            this.hide();
            return;
        }

        this.currentMenu = {
            type: menuType,
            config,
            squareData,
            context,
            buttons: []
        };

        this.buildMenu(config, anchor);
        this.isVisible = true;
        this.container.visible = true;
    }

    /**
     * Builds the menu UI
     */
    buildMenu(config, anchor) {
        const menuHeight = config.options.length * (this.buttonHeight + this.buttonSpacing) + this.menuPadding * 2;

        // Position menu adjacent to anchor, preferring right/down but adjusting for screen bounds
        let menuX = anchor.x + 20; // Offset from square center
        let menuY = anchor.y - menuHeight / 2; // Center vertically on square

        // Clamp to screen bounds
        const screenWidth = this.renderer.maskWidth || 800;
        const screenHeight = this.renderer.maskHeight || 600;

        if (menuX + this.menuWidth > screenWidth) {
            menuX = anchor.x - this.menuWidth - 20; // Try left side
        }
        if (menuX < 0) menuX = 10; // Fallback to left edge

        if (menuY < 10) menuY = 10; // Top edge
        if (menuY + menuHeight > screenHeight) menuY = screenHeight - menuHeight - 10; // Bottom edge

        // Background (semi-transparent filled_box)
        const background = new PIXI.Sprite(this.assets.filled_box);
        background.width = this.menuWidth;
        background.height = menuHeight;
        background.tint = 0x000000;
        background.alpha = 0.8;
        background.x = menuX;
        background.y = menuY;
        this.container.addChild(background);

        // Title (optional, small text)
        if (config.title) {
            const titleText = new PIXI.Text({
                text: config.title,
                style: {
                    fontFamily: 'monospace',
                    fontSize: 10,
                    fill: 0x00ff00,
                    align: 'center'
                }
            });
            titleText.x = menuX + this.menuWidth / 2 - titleText.width / 2;
            titleText.y = menuY + this.menuPadding;
            this.container.addChild(titleText);
        }

        // Build buttons
        const startY = menuY + this.menuPadding + (config.title ? 16 : 0);
        config.options.forEach((option, index) => {
            const buttonY = startY + index * (this.buttonHeight + this.buttonSpacing);
            const button = this.createMenuButton(option, menuX, buttonY, this.menuWidth - this.menuPadding * 2);
            this.currentMenu.buttons.push(button);
        });
    }

    /**
     * Creates a menu button
     */
    createMenuButton(option, x, y, width) {
        const buttonContainer = new PIXI.Container();
        buttonContainer.x = x + this.menuPadding;
        buttonContainer.y = y;

        // Button background (button.svg)
        const buttonBg = new PIXI.Sprite(this.assets.button);
        buttonBg.width = width;
        buttonBg.height = this.buttonHeight;
        buttonBg.tint = 0x444444; // Dark base
        buttonContainer.addChild(buttonBg);

        // Button text
        const buttonText = new PIXI.Text({
            text: option.label,
            style: {
                fontFamily: 'monospace',
                fontSize: 10,
                fill: 0xffffff,
                align: 'center'
            }
        });
        buttonText.x = width / 2 - buttonText.width / 2;
        buttonText.y = this.buttonHeight / 2 - buttonText.height / 2;
        buttonContainer.addChild(buttonText);

        // Make interactive
        buttonContainer.interactive = true;
        buttonContainer.cursor = 'pointer';

        // Hover effects
        buttonContainer.on('pointerover', () => {
            buttonBg.tint = 0x666666;
            buttonText.style.fill = 0x00ff00;
        });

        buttonContainer.on('pointerout', () => {
            buttonBg.tint = 0x444444;
            buttonText.style.fill = 0xffffff;
        });

        buttonContainer.on('pointerdown', () => {
            this.handleMenuSelection(option);
        });

        this.container.addChild(buttonContainer);
        return buttonContainer;
    }

    /**
     * Handles menu button selection
     */
    handleMenuSelection(option) {
        // Emit event with selection data
        this.renderer.container.emit('map:menuSelected', {
            menuType: this.currentMenu.type,
            option: option,
            squareData: this.currentMenu.squareData,
            context: this.currentMenu.context
        });

        // Hide menu after selection
        this.hide();
    }

    /**
     * Clears current menu
     */
    clearMenu() {
        if (this.currentMenu) {
            this.currentMenu.buttons.forEach(button => {
                this.container.removeChild(button);
            });
        }
        this.currentMenu = null;
        this.container.removeChildren();
    }

    /**
     * Hides the menu
     */
    hide() {
        this.clearMenu();
        this.isVisible = false;
        this.container.visible = false;
    }

    /**
     * Updates menu position (for when map pans/zooms)
     */
    updatePosition(newAnchor) {
        if (!this.isVisible || !this.currentMenu) return;

        // Rebuild menu at new position
        this.showMenu(this.currentMenu.type, newAnchor, this.currentMenu.squareData, this.currentMenu.context);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.clearMenu();
        if (this.renderer.container) {
            this.renderer.container.removeChild(this.container);
        }
    }
}