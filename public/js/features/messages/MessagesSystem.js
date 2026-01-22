import { MessagesRenderer } from './MessagesRenderer.js';
import { MessagesController } from './MessagesController.js';
import { MessagesBehaviors } from './MessagesBehaviors.js';
import { buildMessage } from '../../utils/messageBuilder.js';

/**
 * Messages System Facade
 * Provides a simple API for scenes to mount and interact with the Messages feature.
 * Mirrors the MapSystem pattern for consistency.
 */
export class MessagesSystem {
  /**
   * @param {PIXI.Application} app - PIXI application instance
   * @param {Object} assets - Asset manager (not used yet, but for consistency)
   * @param {Object} config - Configuration object
   * @param {string} config.layout - Layout type ('toast' or 'docked')
   * @param {number} config.width - Container width
   * @param {number} config.height - Container height
   * @param {number} config.parentWidth - Parent container width for responsive sizing
   * @param {number} config.parentHeight - Parent container height for responsive sizing
   */
  constructor(app, assets, config = {}) {
    this.app = app;
    this.assets = assets;

    // Create renderer
    this.renderer = new MessagesRenderer(app, assets, config);

    // Controller will be created in init() when we have socketManager
    this.controller = null;

    // Behaviors will be created in init()
    this.behaviors = null;

    // Expose container for scene mounting
    this.container = this.renderer.container;
  }

  /**
   * Initialize the messages system
   * @param {Object} config - Initialization configuration
   * @param {string} config.playerSub - Player's submarine ID
   * @param {string} config.playerRole - Player's role ID
   * @param {Object} config.socketManager - Socket manager instance
   * @param {string} [config.layout] - Override layout type
   * @param {Object} [config.parentDimensions] - Parent container dimensions for responsive sizing
   * @param {number} config.parentDimensions.width - Parent width
   * @param {number} config.parentDimensions.height - Parent height
   */
  init(config = {}) {
    const {
      playerSub,
      playerRole,
      socketManager,
      layout,
      parentDimensions
    } = config;

    if (!socketManager) {
      console.warn('MessagesSystem: socketManager is required for initialization');
      return;
    }

    // Create controller with socket manager
    this.controller = new MessagesController(socketManager, this.renderer, {
      playerSub,
      playerRole
    });

    // Initialize controller
    this.controller.init();

    // Create behaviors
    this.behaviors = new MessagesBehaviors(this.renderer, this.app, config);

    // Update layout if specified
    if (layout && layout !== this.renderer.layout) {
      // For now, recreate renderer with new layout
      // In future, could add dynamic layout switching
      const newConfig = {
        ...this.renderer.config,
        layout: layout,
        width: parentDimensions?.width || this.renderer.config.width,
        height: parentDimensions?.height || this.renderer.config.height,
        parentWidth: parentDimensions?.width,
        parentHeight: parentDimensions?.height
      };

      this.renderer.destroy();
      this.renderer = new MessagesRenderer(this.app, this.assets, newConfig);
      this.container = this.renderer.container;

      // Recreate controller with new renderer
      this.controller.destroy();
      this.controller = new MessagesController(socketManager, this.renderer, {
        playerSub,
        playerRole
      });
      this.controller.init();

      // Recreate behaviors with new renderer
      if (this.behaviors) {
        this.behaviors.destroy();
      }
      this.behaviors = new MessagesBehaviors(this.renderer, this.app, config);
    }
  }

  /**
   * Show the messages system
   */
  show() {
    this.container.visible = true;
  }

  /**
   * Hide the messages system
   */
  hide() {
    this.container.visible = false;
  }

  /**
   * Add a message manually (for testing or direct messages)
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  addMessage(type, data) {
    const message = buildMessage(type, data, this.controller?.playerSub, this.controller?.playerRole);
    if (message) {
      this.renderer.addMessage(message);
    }
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.renderer.clearMessages();
  }

  /**
   * Update the system (called each frame if needed)
   * @param {number} delta - Time delta
   */
  update(delta) {
    if (this.renderer && this.renderer.update) {
      this.renderer.update(delta);
    }
  }

  /**
   * Destroy the messages system and cleanup resources
   */
  destroy() {
    if (this.behaviors) {
      this.behaviors.destroy();
      this.behaviors = null;
    }

    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }

    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    this.container = null;
  }
}