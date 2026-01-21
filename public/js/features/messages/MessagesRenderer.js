import { Container, Text, Graphics, FillGradient, Rectangle, Sprite, Texture } from 'pixi.js';
import { Colors, Font, MessageGradients } from '../../core/uiStyle.js';
import { buildMessage } from '../../utils/messageBuilder.js';

// Global texture cache for gradients to avoid redundant generateTexture calls
const maskTextureCache = new Map();

/**
 * @typedef {Object} MessageLayout
 * @property {string} type - 'toast' or 'docked'
 * @property {number} width - Container width
 * @property {number} height - Container height
 * @property {number} x - Container x position
 * @property {number} y - Container y position
 */

/**
 * PIXI-based renderer for message display system
 * Supports toast overlay and docked window layouts
 */
export class MessagesRenderer {
  /**
   * @param {PIXI.Application} app - PIXI application instance
   * @param {Object} assets - Asset manager
   * @param {Object} config - Configuration object
   * @param {string} config.layout - Layout type ('toast' or 'docked')
   * @param {number} config.width - Container width
   * @param {number} config.height - Container height
   */
  constructor(app, assets, config) {
    this.app = app;
    this.assets = assets;
    this.config = config;

    // Main container
    this.container = new Container();
    this.container.x = 0;
    this.container.y = 0;

    // Message containers and text objects
    this.messageTexts = [];
    this.maxMessages = 20;
    this.totalContentHeight = 0;

    // Layout-specific properties
    this.layout = config.layout || 'toast';
    this.dimensions = { width: 0, height: 0 }; // Initialize dimensions
    this.setupLayout(); // Sets this.dimensions

    // Background for docked mode (added first so it's at the bottom)
    if (this.layout === 'docked') {
      this.createBackground();
    }

    // List container for vertical stacking (added middle)
    this.listContainer = new Container();
    this.container.addChild(this.listContainer);

    // Create mask with gradient (added top)
    this.maskMode = 'normal';
    // this.maskGraphics is no longer needed as a class property for texture generation
    // It's now created locally within updateMask if needed.

    // In PixiJS v8, for a gradient mask to work as an alpha mask, 
    // it's often best to use a Sprite with a generated texture.
    this.maskSprite = new Sprite();
    this.container.addChild(this.maskSprite);
    this.listContainer.mask = this.maskSprite;

    // this.maskTextures is no longer needed as a class property
    this.updateMask();
  }

  /**
   * Update mask gradient based on current mode
   * @private
   */
  updateMask() {
    const mode = this.maskMode;
    const layout = this.layout;
    const cacheKey = `${layout}_${mode}`;
    const width = this.dimensions.width;
    const height = this.dimensions.height;

    // Use global cache for the base textures
    if (!maskTextureCache.has(cacheKey)) {
      const gradients = MessageGradients[layout][mode] || MessageGradients.docked.normal;
      const refSize = 256;

      const graphics = new Graphics(); // Create graphics locally for texture generation
      const gradient = new FillGradient({
        type: 'linear',
        start: { x: 0, y: 1 },
        end: { x: 0, y: 0 },
        colorStops: gradients.map(stop => ({
          offset: stop.offset,
          color: `rgba(255, 255, 255, ${stop.alpha})`
        }))
      });

      graphics.rect(0, 0, refSize, refSize).fill(gradient);

      try {
        const tex = this.app.renderer.generateTexture(graphics);
        maskTextureCache.set(cacheKey, tex);
      } catch (e) {
        console.error('Failed to generate mask texture:', e);
        maskTextureCache.set(cacheKey, Texture.EMPTY);
      }
      graphics.destroy(); // Destroy local graphics object
    }

    const cachedTexture = maskTextureCache.get(cacheKey);

    // Apply cached texture
    if (this.maskSprite.texture !== cachedTexture) {
      this.maskSprite.texture = cachedTexture;
    }

    // Scale the sprite and update hit area efficiently
    if (this.maskSprite.width !== width) this.maskSprite.width = width;
    if (this.maskSprite.height !== height) this.maskSprite.height = height;

    if (!this.container.hitArea || this.container.hitArea.width !== width || this.container.hitArea.height !== height) {
      this.container.hitArea = new Rectangle(0, 0, width, height);
    }

    // Position list container so its bottom matches the mask/visible area bottom
    this.updateContentPosition();
  }

  /**
   * Position content within the visible area
   * @private
   */
  updateContentPosition() {
    const totalHeight = this.getTotalContentHeight();
    // For toast, we usually want the newest message at the bottom of the visible area
    // listContainer.y = dimensions.height - totalHeight (if we want bottom alignment)
    // But updateMessagePositions currently sets y from 0 downwards.
    // So if totalHeight = 100 and dimensions.height = 100, listContainer.y = 0.
    // If totalHeight = 150 and dimensions.height = 100, listContainer.y = -50 (scroll to bottom).

    // We'll let Behaviors handle the scrollOffset, but here we set the base alignment.
    // The listContainer.y is managed by Behaviors.scrollOffset.
  }

  /**
   * Calculate total height of all messages
   * @returns {number}
   */
  getTotalContentHeight() {
    return this.totalContentHeight;
  }

  /**
   * Set mask mode for fading effect
   * @param {string} mode - 'normal' or 'uniform'
   */
  setMaskMode(mode) {
    this.maskMode = mode;
    this.updateMask();
  }

  /**
   * Setup layout-specific properties with responsive sizing
   * @private
   */
  setupLayout() {
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;

    // Mobile breakpoint (common mobile width)
    const isMobile = screenWidth < 768;

    if (this.layout === 'toast') {
      // Toast mode: compact overlay in bottom-left, responsive sizing
      const baseWidth = isMobile ? screenWidth * 0.8 : Math.min(400, screenWidth * 0.4);
      const baseHeightValue = isMobile ? 80 : 100;

      // Store dimensions for layout calculation
      this.baseHeight = this.config.height || baseHeightValue;
      this.dimensions.width = this.config.width || baseWidth;
      this.dimensions.height = this.baseHeight;

      this.container.x = 20;
      this.container.y = screenHeight - this.dimensions.height - 20;
    } else if (this.layout === 'docked') {
      // Docked mode: full available space in control panel
      const parentWidth = this.config.parentWidth || (isMobile ? screenWidth * 0.9 : 400);
      const parentHeight = this.config.parentHeight || (isMobile ? 250 : 300);

      this.dimensions.width = this.config.width || parentWidth;
      this.dimensions.height = this.config.height || parentHeight;

      this.container.x = this.config.x || 0;
      this.container.y = this.config.y || 0;
    }

    console.log('[MessagesRenderer] Layout setup:', this.layout, this.dimensions, 'Pos:', this.container.x, this.container.y);
  }

  /**
   * Create background for docked layout
   * @private
   */
  createBackground() {
    const bg = new Graphics();
    bg.roundRect(0, 0, this.dimensions.width, this.dimensions.height, 8);
    bg.fill({ color: Colors.background, alpha: 0.8 });
    bg.stroke({ color: Colors.border, width: 2 });

    this.container.addChild(bg);
    this.background = bg;
  }

  /**
   * Add a new message to the display
   * @param {FormattedMessage} message - Message object from messageBuilder
   */
  addMessage(message) {
    // Create PIXI.Text object
    const textObj = this.createMessageText(message);

    const oldTotalHeight = this.totalContentHeight; // Use cached value

    // Add to list container
    this.listContainer.addChild(textObj);

    // Force sync height calculation before caching by accessing height property
    const h = textObj.height;

    // Cache the height immediately.
    this.messageTexts.push({
      obj: textObj,
      height: textObj.height
    });

    // Position messages
    this.updateMessagePositions(); // This updates this.totalContentHeight

    const newTotalHeight = this.totalContentHeight; // Use cached value
    const heightDiff = newTotalHeight - oldTotalHeight;

    // Smart auto-scroll to new message
    // We pass true to trigger the slide-up animation (drift back to 0)
    if (this.behaviors && this.behaviors.onContentHeightChanged) {
      this.behaviors.onContentHeightChanged(heightDiff, true);
    }
  }

  /**
   * Remove oldest messages to stay within limit.
   * Called by behaviors when idle at the bottom to avoid jumpy animations.
   */
  cullMessages() {
    // Only cull if we are over the limit
    if (this.messageTexts.length <= this.maxMessages) return;

    let totalRemovedHeight = 0;
    const toRemove = this.messageTexts.length - this.maxMessages;

    console.log(`[MessagesRenderer] Culling ${toRemove} old messages`);

    for (let i = 0; i < toRemove; i++) {
      const entry = this.messageTexts.shift();
      totalRemovedHeight += entry.height + 5;
      this.listContainer.removeChild(entry.obj);
      entry.obj.destroy();
    }

    // Update positions and total height
    this.updateMessagePositions(); // This updates this.totalContentHeight

    // Notify behaviors ONCE for the bulk change
    if (this.behaviors && this.behaviors.onContentHeightChanged) {
      this.behaviors.onContentHeightChanged(-totalRemovedHeight, false, true);
    }
  }

  /**
   * Create PIXI.Text object for message
   * @param {FormattedMessage} message - Message data
   * @returns {PIXI.Text} PIXI text object
   * @private
   */
  createMessageText(message) {
    // Determine color based on priority
    let color = Colors.text; // normal
    if (message.priority === 'warning') {
      color = Colors.caution;
    } else if (message.priority === 'critical') {
      color = Colors.danger;
    }

    // Create text with Orbitron font
    console.log(`[MessagesRenderer] Creating text: "${message.text}" with color: ${color.toString(16)}`);
    const textObj = new Text({
      text: message.text,
      style: {
        fontFamily: Font.family,
        fontSize: this.getFontSize(message.priority),
        fill: color,
        align: 'left'
      }
    });

    // Store message data for reference
    textObj.messageData = message;

    return textObj;
  }

  /**
   * Get font size based on priority (12-18px range as per plan)
   * @param {string} priority - Message priority
   * @returns {number} Font size in pixels
   * @private
   */
  getFontSize(priority) {
    switch (priority) {
      case 'critical':
        return 22;
      case 'warning':
        return 20;
      default: // normal
        return 18;
    }
  }

  /**
   * Update positions of all message texts in list container
   * Messages stacked vertically from top to bottom, newest at bottom
   * @private
   */
  updateMessagePositions() {
    let currentY = 0;
    for (let i = 0; i < this.messageTexts.length; i++) {
      const entry = this.messageTexts[i];
      entry.obj.x = 10; // Left margin
      entry.obj.y = currentY;
      currentY += entry.height + 5; // Use cached height
    }
    this.totalContentHeight = currentY; // Update cached total height
  }



  /**
   * Animate message insertion with smooth slide
   * @param {PIXI.Text} textObj - The text object to animate
   * @private
   */
  animateMessageInsertion(textObj) {
    // Legacy - no longer needed with gradient mask
    textObj.alpha = 1;
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.messageTexts.forEach(entry => {
      this.listContainer.removeChild(entry.obj);
      entry.obj.destroy();
    });
    this.messageTexts = [];
    this.totalContentHeight = 0; // Reset totalContentHeight
    this.targetScrollOffset = 0;
    if (this.behaviors) {
      this.behaviors.scrollOffset = 0;
      this.behaviors.targetScrollOffset = 0;
    }
  }

  /**
   * Update renderer (called each frame)
   * @param {number} delta - Time delta
   */
  update(delta) {
    // Could add animations here in future phases
    // For now, static positioning
  }

  /**
   * Destroy renderer and cleanup
   */
  destroy() {
    this.clearMessages();
    if (this.background) {
      this.container.removeChild(this.background);
      this.background.destroy();
    }
    this.container.destroy({ children: true });
  }
}