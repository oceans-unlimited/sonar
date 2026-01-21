import { Container, Text, Graphics, FillGradient, Rectangle } from 'pixi.js';
import { Colors, Font, MessageGradients } from '../../core/uiStyle.js';

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

    // List container for vertical stacking
    this.listContainer = new Container();
    this.container.addChild(this.listContainer);

    // Message containers and text objects
    this.messageTexts = [];
    this.maxMessages = 20;

    // Layout-specific properties
    this.layout = config.layout || 'toast';
    this.dimensions = { width: 0, height: 0 }; // Initialize dimensions
    this.setupLayout(); // Sets this.dimensions

    // Create mask with gradient
    this.maskMode = 'normal';
    this.maskGraphics = new Graphics();
    this.container.addChild(this.maskGraphics);
    this.listContainer.mask = this.maskGraphics;
    this.updateMask();

    // Background for docked mode
    if (this.layout === 'docked') {
      this.createBackground();
    }
  }

  /**
   * Update mask gradient based on current mode
   * @private
   */
  updateMask() {
    const gradients = MessageGradients[this.layout][this.maskMode];
    this.maskGraphics.clear();

    // The mask should cover the entire visible area defined by this.dimensions
    const gradient = new FillGradient({
      type: 'linear',
      from: { x: 0, y: 0 }, // Top
      to: { x: 0, y: this.dimensions.height }, // Bottom
      colorStops: gradients.map(stop => ({
        offset: stop.offset,
        color: `#${stop.color.toString(16).padStart(6, '0')}${Math.round(stop.alpha * 255).toString(16).padStart(2, '0')}`
      }))
    });

    this.maskGraphics.rect(0, 0, this.dimensions.width, this.dimensions.height).fill(gradient);

    // Update container hitArea to match dimensions so it catches wheel events correctly
    this.container.hitArea = new Rectangle(0, 0, this.dimensions.width, this.dimensions.height);

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
    let totalHeight = 0;
    this.messageTexts.forEach(textObj => {
      totalHeight += textObj.height + 5;
    });
    return totalHeight;
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
      const baseHeight = isMobile ? 80 : 100; // Compact by default (50% of expanded)

      // Store dimensions for layout calculation
      this.dimensions.width = this.config.width || baseWidth;
      this.dimensions.height = this.config.height || baseHeight;

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

    // Add to list container
    this.listContainer.addChild(textObj);
    this.messageTexts.push(textObj); // Add to end (bottom)

    // Position messages
    this.updateMessagePositions();

    // Remove oldest messages if over limit (from top)
    if (this.messageTexts.length > this.maxMessages) {
      const oldText = this.messageTexts.shift(); // Remove from beginning (top)
      this.listContainer.removeChild(oldText);
      oldText.destroy();
    }

    // Smart auto-scroll to new message
    if (this.behaviors && this.behaviors.scrollToLatest) {
      this.behaviors.scrollToLatest();
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
        return 18;
      case 'warning':
        return 16;
      default: // normal
        return 12;
    }
  }

  /**
   * Update positions of all message texts in list container
   * Messages stacked vertically from top to bottom, newest at bottom
   * @private
   */
  updateMessagePositions() {
    let yOffset = 0; // Start from top of list container

    // Position messages from oldest (top) to newest (bottom)
    for (let i = 0; i < this.messageTexts.length; i++) {
      const textObj = this.messageTexts[i];
      textObj.x = 10; // Left margin
      textObj.y = yOffset;
      yOffset += textObj.height + 5; // Move down for next message
    }
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
    this.messageTexts.forEach(textObj => {
      this.container.removeChild(textObj);
      textObj.destroy();
    });
    this.messageTexts = [];
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
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
    }
    this.container.destroy();
  }
}