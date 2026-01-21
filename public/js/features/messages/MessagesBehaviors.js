import { Rectangle } from 'pixi.js';

/**
 * Messages Behaviors - Interactive behaviors for message system
 * Handles user interactions like clicking, scrolling, and inactivity timers
 */

export class MessagesBehaviors {
  /**
   * @param {MessagesRenderer} renderer - The messages renderer
   * @param {PIXI.Application} app - PIXI application instance
   * @param {Object} config - Configuration object
   */
  constructor(renderer, app, config = {}) {
    this.renderer = renderer;
    this.app = app;
    this.config = config;

    this.inactivityTimer = null;
    this.scrollOffset = 0;
    this.targetScrollOffset = 0;
    this.lastScrollTime = Date.now();

    // Bind methods
    this.onToastClick = this.onToastClick.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onInactivityTimeout = this.onInactivityTimeout.bind(this);
    this.updateAnimations = this.updateAnimations.bind(this);

    this.setupBehaviors();

    this.isUserScrolling = false;
    this.lastInteractionTime = Date.now();
  }

  /**
   * Setup interactive behaviors based on layout and device type
   * @private
   */
  setupBehaviors() {
    const container = this.renderer.container;
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;

    container.eventMode = 'static';
    container.hitArea = new Rectangle(0, 0, this.renderer.dimensions.width, this.renderer.dimensions.height);

    if (this.renderer.layout === 'toast') {
      if (isMobile) {
        // Mobile: prioritize touch scrolling over click expansion
        this.setupTouchScrolling();
      } else {
        // Desktop: click to expand
        container.cursor = 'pointer';
        container.on('pointerdown', this.onToastClick);
      }
    } else if (this.renderer.layout === 'docked') {
      // Docked mode: always scrollable
      this.setupScrolling();
    }

    // Start animation ticker
    this.app.ticker.add(this.updateAnimations);
  }

  /**
   * Handle toast container click to expand
   * @private
   */
  onToastClick() {
    // Always expand on click (no toggle behavior)
    this.isUserScrolling = false;
    this.animateContainerExpansion(true);
    this.resetInactivityTimer();
  }

  /**
   * Animate container expansion/collapse
   * @param {boolean} expand - Whether to expand or collapse
   * @private
   */
  animateContainerExpansion(expand) {
    const renderer = this.renderer;
    const container = renderer.container;

    const startHeight = renderer.dimensions.height;
    const bottomY = container.y + startHeight; // Fixed bottom edge

    const targetHeight = expand ? startHeight * 2 : startHeight / 2;
    // Note: We use renderer.dimensions.height to control the mask reveal

    let elapsed = 0;
    const duration = 300; // 0.3s as per plan

    const animate = (ticker) => {
      elapsed += ticker.deltaTime * 16.67; // Convert to ms
      const t = Math.min(1, elapsed / duration);

      // Ease-in-out function
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      renderer.dimensions.height = startHeight + (targetHeight - startHeight) * easedT;

      // Update Y to keep bottom fixed
      container.y = bottomY - renderer.dimensions.height;

      // Update mask during animation
      renderer.updateMask();
      this.updateScrollPosition();

      if (t >= 1) {
        this.app.ticker.remove(animate);
      }
    };

    this.app.ticker.add(animate);
  }

  /**
   * Setup scrolling for docked mode
   * @private
   */
  setupScrolling() {
    const container = this.renderer.container;

    // Mouse wheel scrolling
    container.on('wheel', this.onScroll);

    // For mobile/touch scrolling (basic implementation)
    let touchStartY = 0;
    container.on('touchstart', (event) => {
      touchStartY = event.data.global.y;
    });

    container.on('touchmove', (event) => {
      const deltaY = touchStartY - event.data.global.y;
      touchStartY = event.data.global.y;
      this.handleScroll(deltaY * 2); // Amplify touch scrolling
    });
  }

  /**
   * Setup touch scrolling for mobile toast mode
   * @private
   */
  setupTouchScrolling() {
    const container = this.renderer.container;

    let touchStartY = 0;
    let touchStartTime = 0;
    let isUserScrolling = false;

    container.on('touchstart', (event) => {
      touchStartY = event.data.global.y;
      touchStartTime = Date.now();
      this.isUserScrolling = true;
    });

    container.on('touchmove', (event) => {
      const deltaY = touchStartY - event.data.global.y;
      const velocity = Math.abs(deltaY) / (Date.now() - touchStartTime);

      // Require minimum velocity or distance to prevent false scrolling
      if (Math.abs(deltaY) > 15 || velocity > 0.5) {
        this.isUserScrolling = true;
        this.handleScroll(deltaY * 2);
        touchStartY = event.data.global.y;
        touchStartTime = Date.now();
      }
    });

    container.on('touchend', () => {
      // Only trigger click if it was a tap (not a scroll)
      if (!this.isUserScrolling) {
        // Treat as click - expand toast
        this.onToastClick();
      }
      this.isUserScrolling = false;
    });
  }

  /**
   * Handle wheel scroll event
   * @param {InteractionEvent} event - PIXI interaction event
   */
  onScroll(event) {
    // Prevent browser scrolling and stop propagation if event is cancelable
    if (event.nativeEvent && event.nativeEvent.cancelable) {
      event.nativeEvent.preventDefault();
    }
    event.stopPropagation();

    this.handleScroll(event.deltaY);
  }

  /**
   * Handle scroll input
   * @param {number} deltaY - Scroll delta
   * @private
   */
  handleScroll(deltaY) {
    this.isUserScrolling = true;
    this.lastInteractionTime = Date.now();

    const viewHeight = this.renderer.dimensions.height;
    const totalContentHeight = this.getTotalContentHeight();
    const maxScroll = Math.max(0, totalContentHeight - viewHeight);

    //scrolling up (negative deltaY) shows OLDER messages (higher offset)
    //scrolling down (positive deltaY) shows NEWER messages (lower offset)
    this.targetScrollOffset = Math.max(0, Math.min(maxScroll, this.targetScrollOffset - deltaY));

    // Set mask to uniform mode during scrolling
    this.renderer.setMaskMode('uniform');
    this.lastScrollTime = Date.now();

    this.resetInactivityTimer();
    this.updateScrollPosition();
  }

  /**
   * Update scroll position by moving the list container
   * @private
   */
  updateScrollPosition() {
    const renderer = this.renderer;
    const totalHeight = renderer.getTotalContentHeight();
    const viewHeight = renderer.dimensions.height;

    // Move the list container. 
    // Default position: bottom of content at bottom of view.
    // listContainer.y = viewHeight - totalHeight
    // Then apply scrollOffset (positive scrollOffset means we move content DOWN to see older messages)
    // Wait, scrollOffset logic: 
    // handleScroll says: this.targetScrollOffset = Math.max(0, Math.min(maxScroll, this.targetScrollOffset - deltaY));
    // If deltaY is negative (scroll up), targetScrollOffset increases.
    // Since newest are at bottom, scrolling up should reveal OLDER (top) messages.
    // oldest at y=0, newest at y=totalHeight.
    // To see oldest, we need listContainer.y to be >= 0.

    // Bottom-aligned view (default):
    const baseY = Math.min(0, viewHeight - totalHeight);
    renderer.listContainer.y = baseY + this.scrollOffset;

    // Add scroll indicator if content extends beyond view
    const canScrollHistory = this.scrollOffset < this.getMaxScroll() - 10;
    const canScrollLatest = this.scrollOffset > 10;

    this.showScrollHint(canScrollHistory, canScrollLatest);
  }

  /**
   * Show or hide scroll hint based on scrollability
   * @param {boolean} canScrollHistory - Whether user can scroll to older messages
   * @param {boolean} canScrollLatest - Whether user can scroll to newer messages
   * @private
   */
  showScrollHint(canScrollHistory, canScrollLatest) {
    //simple arrow indicators or fade effects
    if (canScrollHistory) {
      // Show "↑ More history" indicator at top
    }
    if (canScrollLatest) {
      // Show "↓ More history" indicator at bottom
    }
  }

  /**
   * Reset inactivity timer
   * @private
   */
  resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

    // After 1.5s of no interaction, return to latest messages
    this.inactivityTimer = setTimeout(() => {
      this.onInactivityTimeout();
    }, 1500);
  }

  /**
   * Handle inactivity timeout - collapse expanded toast
   * @private
   */
  onInactivityTimeout() {
    // Reset scroll state
    this.targetScrollOffset = 0;
    this.isUserScrolling = false;

    // Layout-specific cleanup
    if (this.renderer.layout === 'toast') {
      this.animateContainerExpansion(false);
    }
  }

  /**
   * Animate scroll to target offset
   * @param {number} targetOffset - Target scroll offset
   * @param {number} duration - Animation duration in ms
   * @private
   */
  scrollToLatest() {
    const timeSinceLastScroll = Date.now() - this.lastInteractionTime;
    const SCROLL_COOLDOWN = 1000; // 1 second cooldown

    //Only auto-scroll if:
    //1. User hasn't interacted recently
    //2. User isn't actively scrolling
    if (!this.isUserScrolling || timeSinceLastScroll > SCROLL_COOLDOWN) {
      this.targetScrollOffset = 0;
      this.isUserScrolling = false;

      this.lastInteractionTime = Date.now();
      this.lastScrollTime = Date.now();
    }
  }

  /**
   * Update animations and smooth scrolling
   * @param {number} delta - Ticker delta
   * @private
   */
  updateAnimations(ticker) {
    const delta = ticker.deltaTime;
    // Smooth scroll interpolation
    const scrollSpeed = 0.1;
    this.scrollOffset += (this.targetScrollOffset - this.scrollOffset) * scrollSpeed;

    if (Math.abs(this.scrollOffset - this.targetScrollOffset) > 0.1) {
      this.updateScrollPosition();
    }

    // Revert mask to normal mode if not scrolling recently
    if (Date.now() - this.lastInteractionTime > 300 && !this.isUserScrolling) {
      this.renderer.setMaskMode('normal');
    }
  }

  /**
   * Cleanup behaviors
   */
  destroy() {
    const container = this.renderer.container;

    // Remove event listeners
    container.off('pointerdown', this.onToastClick);
    container.off('wheel', this.onScroll);

    // Clear timers
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Remove ticker
    this.app.ticker.remove(this.updateAnimations);
  }

  /**
   * Get maximum allowed scroll offset
   * @returns {number}
   * @private
   */
  getMaxScroll() {
    const viewHeight = this.renderer.dimensions.height;
    const totalHeight = this.getTotalContentHeight();
    return Math.max(0, totalHeight - viewHeight);
  }

  /**
   * Calculate total height of all messages including margins
   * @returns {number} Total content height in pixels
   * @private
   */
  getTotalContentHeight() {
    let totalHeight = 0;
    this.renderer.messageTexts.forEach(textObj => {
      totalHeight += textObj.height + 5; // Message height + 5px margin
    });
    return totalHeight;
  }
}