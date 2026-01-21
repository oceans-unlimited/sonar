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
    this.renderer.behaviors = this; // Link back to renderer
    this.app = app;
    this.config = config;

    this.isDragging = false;
    this.dragStartY = 0;
    this.dragStartTime = 0;
    this.dragDistance = 0;
    this.isExpanded = false;
    this.expansionAnimate = null;

    this.inactivityTimer = null;
    this.scrollOffset = 0;
    this.targetScrollOffset = 0;
    this.lastScrollTime = Date.now();
    this.lastInteractionTime = Date.now();

    // Bind methods
    this.onToastClick = this.onToastClick.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
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

    container.eventMode = 'static';
    container.hitArea = new Rectangle(0, 0, this.renderer.dimensions.width, this.renderer.dimensions.height);

    // Mouse wheel scrolling
    container.on('wheel', this.onScroll);

    // Unified pointer-based dragging (for both Toast and Docked)
    // This allows mouse-drag on desktop and touch-drag on mobile
    container.on('pointerdown', this.onPointerDown);
    container.on('pointermove', this.onPointerMove);
    container.on('pointerup', this.onPointerUp);
    container.on('pointerupoutside', this.onPointerUp);

    if (this.renderer.layout === 'toast') {
      container.cursor = 'pointer';
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
    this.renderer.setMaskMode('uniform');
    this.animateContainerExpansion(true);
  }

  /**
   * Animate container expansion/collapse
   * @param {boolean} expand - Whether to expand or collapse
   * @private
   */
  animateContainerExpansion(expand) {
    if (this.renderer.layout !== 'toast') return;

    const renderer = this.renderer;
    const container = renderer.container;

    // Use stored baseHeight to calculate stable target
    const baseHeight = renderer.baseHeight;
    const targetHeight = expand ? baseHeight * 2 : baseHeight;

    // Stop if already at target
    if (this.isExpanded === expand && Math.abs(renderer.dimensions.height - targetHeight) < 1) {
      return;
    }

    this.isExpanded = expand;

    // Remove any existing expansion ticker
    if (this.expansionAnimate) {
      this.app.ticker.remove(this.expansionAnimate);
    }

    const startHeight = renderer.dimensions.height;
    const bottomY = container.y + startHeight; // Fixed bottom edge

    let elapsed = 0;
    const duration = 250; // Snappy 0.25s

    this.expansionAnimate = (ticker) => {
      elapsed += ticker.deltaTime * 16.67;
      const t = Math.min(1, elapsed / duration);

      // Ease-out expo for premium feel
      const easedT = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

      renderer.dimensions.height = startHeight + (targetHeight - startHeight) * easedT;

      // Update Y to keep bottom fixed
      container.y = bottomY - renderer.dimensions.height;

      // Update mask during animation
      renderer.updateMask();
      this.updateScrollPosition();

      if (t >= 1) {
        this.app.ticker.remove(this.expansionAnimate);
        this.expansionAnimate = null;
      }
    };

    this.app.ticker.add(this.expansionAnimate);
  }

  /**
   * Universal pointer down handler for dragging and clicks
   * @param {Object} event - PIXI interaction event
   * @private
   */
  onPointerDown(event) {
    this.dragStartY = event.data.global.y;
    this.dragStartTime = Date.now();
    this.isDragging = true;
    this.dragDistance = 0;
    this.isUserScrolling = true; // Mark as active to prevent auto-scrolling

    // Set uniform mode immediately on press/touch for all layouts
    this.renderer.setMaskMode('uniform');

    // Expand toast immediately on press
    if (this.renderer.layout === 'toast') {
      this.animateContainerExpansion(true);
    }
  }

  /**
   * Universal pointer move handler for dragging
   * @param {Object} event - PIXI interaction event
   * @private
   */
  onPointerMove(event) {
    if (!this.isDragging) return;

    const currentY = event.data.global.y;
    const deltaY = this.dragStartY - currentY;

    // Accumulate total dragging distance to distinguish click from drag
    this.dragDistance += Math.abs(deltaY);

    // Only scroll if we've moved a threshold distance
    if (this.dragDistance > 10) {
      this.handleScroll(deltaY * 1.5);
      this.dragStartY = currentY;
    }
  }

  /**
   * Universal pointer up handler for finishing drags and detecting clicks
   * @private
   */
  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Detection for "Click/Tap" vs "Scroll/Drag"
    // Short duration and low movement = Click
    const dragDuration = Date.now() - this.dragStartTime;
    if (this.dragDistance < 15 && dragDuration < 300) {
      if (this.renderer.layout === 'toast') {
        this.onToastClick();
      }
    }

    this.isUserScrolling = false;
    this.resetInactivityTimer(); // Finally start timer on release
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
    this.resetInactivityTimer();
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

    this.updateScrollPosition();
  }

  /**
   * Update scroll position by moving the list container
   * @private
   */
  updateScrollPosition() {
    const renderer = this.renderer;
    if (!renderer || !renderer.listContainer || renderer.container.destroyed) return;
    const totalHeight = renderer.getTotalContentHeight();
    const viewHeight = renderer.dimensions.height;
    const maxScroll = Math.max(0, totalHeight - viewHeight);

    // Clamp scroll offset to valid range
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset));
    this.targetScrollOffset = Math.max(0, Math.min(maxScroll, this.targetScrollOffset));

    // Move the list container. 
    // Default position: bottom of content at bottom of view.
    const baseY = viewHeight - totalHeight;
    renderer.listContainer.y = baseY + this.scrollOffset;

    // Add scroll indicator if content extends beyond view
    const canScrollHistory = this.scrollOffset < maxScroll - 10;
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
    // 1. First revert to normal gradient fill
    this.renderer.setMaskMode('normal');

    // 2. Return to 0 offset (latest messages)
    this.targetScrollOffset = 0;
    this.isUserScrolling = false;

    // 3. For toast, collapse the container
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
  /**
   * Handle content height changes (e.g., new message added or old one removed)
   * @param {number} heightDiff - Change in total content height
   * @param {boolean} triggerDrift - For additions, whether to slide back to bottom
   * @param {boolean} isFromTop - Whether the change happens at the top of the list (culling)
   */
  onContentHeightChanged(heightDiff, triggerDrift = true, isFromTop = false) {
    // If the change happens at the bottom (addition), we adjust offset to keep view stable.
    // If it happens at the top (culling), we don't adjust because the baseY change 
    // and content shift already cancel each other out.
    if (!isFromTop) {
      this.scrollOffset += heightDiff;

      // If triggerDrift is true and user is not scrolling, 
      // we want to drift back to 0 (latest messages).
      if (triggerDrift && !this.isUserScrolling) {
        this.targetScrollOffset = 0;
      } else {
        // Otherwise, we keep the relative scroll target stable too
        this.targetScrollOffset += heightDiff;
      }
    }

    this.updateScrollPosition();
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
    } else if (Math.abs(this.scrollOffset) < 1 && !this.isUserScrolling) {
      // When we are idle at the bottom, perform cleanup of old messages
      // slide has finished, so we can cull without visual disruption
      this.renderer.cullMessages();
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