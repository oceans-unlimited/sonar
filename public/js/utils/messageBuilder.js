import { getMessageTemplate } from '../features/messages/messageVocabulary.js';

/**
 * @typedef {Object} FormattedMessage
 * @property {string} text - The final formatted message text
 * @property {string} type - The message type
 * @property {string} priority - Message priority ('normal', 'warning', 'critical')
 * @property {number} timestamp - Unix timestamp when message was created
 */

/**
 * Builds a formatted message from vocabulary template and data
 * @param {string} type - Message type from MESSAGE_TYPES
 * @param {Object} data - Data object containing placeholder values
 * @param {string} [playerSub] - Current player's submarine ID (for filtering)
 * @param {string} [playerRole] - Current player's role ID (for filtering)
 * @returns {FormattedMessage|null} Formatted message object or null if filtered out
 */
export function buildMessage(type, data, playerSub, playerRole) {
  const template = getMessageTemplate(type);

  if (!template) {
    console.warn(`No message template found for type: ${type}`);
    return null;
  }

  // Apply filters (initially disabled for debugging)
  // TODO: Enable filtering in Phase 2
  // if (!passesFilters(template.filters, playerSub, playerRole)) {
  //   return null;
  // }

  // Replace placeholders in template
  let messageText = template.template;

  // Replace all placeholders with data values
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    if (messageText.includes(placeholder)) {
      messageText = messageText.replace(new RegExp(placeholder, 'g'), String(value));
    }
  }

  // Check if any placeholders remain unfilled
  const remainingPlaceholders = messageText.match(/\{[^}]+\}/g);
  if (remainingPlaceholders) {
    console.warn(`Unfilled placeholders in message: ${remainingPlaceholders.join(', ')}`);
  }

  return {
    text: messageText,
    type: type,
    priority: template.priority,
    timestamp: Date.now()
  };
}

/**
 * Checks if a message passes the configured filters
 * @param {Object} filters - Filter configuration from template
 * @param {string} playerSub - Player's submarine ID
 * @param {string} playerRole - Player's role ID
 * @returns {boolean} True if message should be displayed
 * @private
 */
function passesFilters(filters, playerSub, playerRole) {
  if (!filters) {
    return true; // No filters means visible to all
  }

  // Check submarine filter
  if (filters.submarines && filters.submarines.length > 0) {
    if (!filters.submarines.includes(playerSub)) {
      return false;
    }
  }

  // Check role filter
  if (filters.roles && filters.roles.length > 0) {
    if (!filters.roles.includes(playerRole)) {
      return false;
    }
  }

  return true;
}