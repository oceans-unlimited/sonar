import { buildMessage } from '../../utils/messageBuilder.js';
import { MESSAGE_TYPES } from './messageVocabulary.js';

/**
 * Controller for processing game state updates and generating messages
 * Listens to socket events and detects meaningful game events
 */
export class MessagesController {
  /**
   * @param {Object} socketManager - Socket manager instance
   * @param {MessagesRenderer} renderer - Messages renderer instance
   * @param {Object} config - Configuration object
   * @param {string} [config.playerSub] - Player's submarine ID
   * @param {string} [config.playerRole] - Player's role ID
   */
  constructor(socketManager, renderer, config = {}) {
    this.socketManager = socketManager;
    this.renderer = renderer;
    this.playerSub = config.playerSub;
    this.playerRole = config.playerRole;

    this.previousState = null;

    // Bind event handler
    this.handleStateUpdate = this.handleStateUpdate.bind(this);
  }

  /**
   * Initialize the controller - start listening to socket events
   */
  init() {
    this.socketManager.on('stateUpdate', this.handleStateUpdate);
  }

  /**
   * Handle state update from socket
   * @param {Object} newState - New game state
   * @private
   */
  async handleStateUpdate(newState) {
    if (!this.previousState) {
      console.log('MessagesController: First state update. Initializing previousState.');
      // First state update - just store it
      this.previousState = newState;
      return;
    }

    console.log('MessagesController: Detecting events...');
    // Detect events by comparing states
    const events = await this.detectEvents(this.previousState, newState);
    console.log(`MessagesController: Detected ${events.length} events:`, events);

    // Generate and display messages for detected events
    for (const event of events) {
      const message = buildMessage(event.type, event.data, this.playerSub, this.playerRole);
      console.log('MessagesController: Built message:', message);
      if (message) {
        this.renderer.addMessage(message);
      }
    }

    // Update previous state
    this.previousState = newState;
  }

  /**
   * Detect events by comparing old and new game states
   * @param {Object} oldState - Previous game state
   * @param {Object} newState - New game state
   * @returns {Promise<Array>} Array of detected events
   * @private
   */
  async detectEvents(oldState, newState) {
    const events = [];

    try {
      // Detect movement events
      const movementEvents = this.detectMovementEvents(oldState, newState);
      events.push(...movementEvents);

      // Detect damage events
      const damageEvents = this.detectDamageEvents(oldState, newState);
      events.push(...damageEvents);

      // Detect system events
      const systemEvents = this.detectSystemEvents(oldState, newState);
      events.push(...systemEvents);

      // Detect game phase events
      const gameEvents = this.detectGameEvents(oldState, newState);
      events.push(...gameEvents);

      // Could add more event detectors here:
      // - Torpedo events
      // - Sonar events
      // - Combat events

    } catch (error) {
      console.error('Error detecting events:', error);
    }

    return events;
  }

  /**
   * Detect submarine movement events
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @returns {Array} Movement events
   * @private
   */
  detectMovementEvents(oldState, newState) {
    const events = [];

    // Assume state has submarines array with position data
    const oldSubs = oldState.submarines || [];
    const newSubs = newState.submarines || [];

    for (let i = 0; i < newSubs.length; i++) {
      const oldSub = oldSubs[i];
      const newSub = newSubs[i];

      if (!oldSub || !newSub) continue;

      // Check if position changed
      if (oldSub.x !== newSub.x || oldSub.y !== newSub.y) {
        events.push({
          type: MESSAGE_TYPES.MOVEMENT,
          data: {
            submarine: newSub.name || `Submarine ${i + 1}`,
            direction: this.getMovementDirection(oldSub, newSub)
          }
        });
      }
    }

    return events;
  }

  /**
   * Detect damage events
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @returns {Array} Damage events
   * @private
   */
  detectDamageEvents(oldState, newState) {
    const events = [];

    const oldSubs = oldState.submarines || [];
    const newSubs = newState.submarines || [];

    for (let i = 0; i < newSubs.length; i++) {
      const oldSub = oldSubs[i];
      const newSub = newSubs[i];

      if (!oldSub || !newSub) continue;

      // Check if health/damage changed
      const oldHealth = oldSub.health || 0;
      const newHealth = newSub.health || 0;

      if (newHealth < oldHealth) {
        const damage = oldHealth - newHealth;
        events.push({
          type: MESSAGE_TYPES.DAMAGE,
          data: {
            submarine: newSub.name || `Submarine ${i + 1}`,
            damage: damage,
            source: 'unknown' // Could be enhanced to track damage source
          }
        });
      }
    }

    return events;
  }

  /**
   * Detect system status events
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @returns {Array} System events
   * @private
   */
  detectSystemEvents(oldState, newState) {
    const events = [];

    // Placeholder for system status detection
    // Could check reactor power, weapon status, etc.

    return events;
  }

  /**
   * Detect game phase events
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @returns {Array} Game events
   * @private
   */
  detectGameEvents(oldState, newState) {
    const events = [];

    // Check phase changes
    if (oldState.phase !== newState.phase) {
      events.push({
        type: MESSAGE_TYPES.GAME_EVENTS,
        data: {
          event: `Phase changed to ${newState.phase}`
        }
      });
    }

    return events;
  }

  /**
   * Get movement direction description
   * @param {Object} oldPos - Old position
   * @param {Object} newPos - New position
   * @returns {string} Direction description
   * @private
   */
  getMovementDirection(oldPos, newPos) {
    const dx = newPos.x - oldPos.x;
    const dy = newPos.y - oldPos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'east' : 'west';
    } else {
      return dy > 0 ? 'south' : 'north';
    }
  }

  /**
   * Cleanup controller
   */
  destroy() {
    if (this.socketManager && this.socketManager.off) {
      this.socketManager.off('stateUpdate', this.handleStateUpdate);
    }
  }
}