/**
 * Message Vocabulary Constants
 * Maps socket events to player-friendly message templates
 * Designed for future migration to relational database
 */

/**
 * @typedef {Object} MessageTemplate
 * @property {string} template - The message template string with placeholders
 * @property {string} priority - Message priority level ('normal', 'warning', 'critical')
 * @property {Object} [filters] - Optional filters for submarine/role visibility
 * @property {string[]} [filters.submarines] - Array of submarine IDs that can see this message
 * @property {string[]} [filters.roles] - Array of role IDs that can see this message
 */

/**
 * Message types enum for event categorization
 */
export const MESSAGE_TYPES = {
  MOVEMENT: 'MOVEMENT',
  DAMAGE: 'DAMAGE',
  TORPEDO: 'TORPEDO',
  SONAR: 'SONAR',
  SYSTEMS: 'SYSTEMS',
  GAME_EVENTS: 'GAME_EVENTS',
  COMBAT: 'COMBAT',
  STATUS: 'STATUS'
};

/**
 * Message vocabulary mapping event types to templates
 * Each entry contains template strings with placeholders and optional filters
 * Templates use {placeholder} syntax for substitution
 * Designed to be easily replaced with database queries in future
 */
export const MESSAGE_VOCABULARY = {
  [MESSAGE_TYPES.MOVEMENT]: {
    template: '{submarine} moved {direction}',
    priority: 'normal',
    // No filters - all players see movement
  },

  [MESSAGE_TYPES.DAMAGE]: {
    template: '{submarine} took {damage} damage from {source}',
    priority: 'warning',
    // No filters initially - can be added for role-based visibility
  },

  [MESSAGE_TYPES.TORPEDO]: {
    template: '{submarine} fired a torpedo at {target}',
    priority: 'critical',
    filters: {
      // Example: Only players on the firing submarine can see torpedo messages
      // submarines: ['{submarine}'], // Would need dynamic evaluation
    }
  },

  [MESSAGE_TYPES.SONAR]: {
    template: 'Sonar detected {submarine} at sector {sector}',
    priority: 'normal',
  },

  [MESSAGE_TYPES.SYSTEMS]: {
    template: '{submarine} systems: {system} {status}',
    priority: 'warning',
  },

  [MESSAGE_TYPES.GAME_EVENTS]: {
    template: 'Game: {event}',
    priority: 'normal',
  },

  [MESSAGE_TYPES.COMBAT]: {
    template: '{submarine} engaged in combat with {target}',
    priority: 'critical',
  },

  [MESSAGE_TYPES.STATUS]: {
    template: '{submarine} status: {status}',
    priority: 'normal',
  }
};

/**
 * Helper function to get message template by type
 * @param {string} type - Message type from MESSAGE_TYPES
 * @returns {MessageTemplate|null} The message template or null if not found
 */
export function getMessageTemplate(type) {
  return MESSAGE_VOCABULARY[type] || null;
}

/**
 * Helper function to get all available message types
 * @returns {string[]} Array of message type keys
 */
export function getMessageTypes() {
  return Object.keys(MESSAGE_VOCABULARY);
}