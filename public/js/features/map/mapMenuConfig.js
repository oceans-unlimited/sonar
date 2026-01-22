/**
 * Map Menu Configuration
 * Configuration for intent-driven map menus.
 */

import { MapIntents } from './mapConstants.js';

export const MapMenuConfigs = {
    /**
     * Intent menu configuration
     * Shows when selecting a square with WAYPOINT intent
     */
    intentMenu: {
        type: 'intent',
        title: 'Select Action',
        options: [
            {
                id: 'set_waypoint',
                label: 'Set Waypoint',
                intent: MapIntents.WAYPOINT,
                condition: (squareData, context) => {
                    // Can set waypoint if it's not already the current waypoint
                    return !squareData.isCurrentWaypoint;
                }
            },
            {
                id: 'cancel_waypoint',
                label: 'Cancel Waypoint',
                intent: MapIntents.WAYPOINT,
                action: 'cancel',
                condition: (squareData, context) => {
                    // Show cancel if this is the current waypoint
                    return squareData.isCurrentWaypoint;
                }
            }
        ]
    },

    /**
     * Context menu configuration
     * Shows on right-click/long-press, allows switching intents
     */
    contextMenu: {
        type: 'context',
        title: 'Change Intent',
        options: [
            {
                id: 'intent_waypoint',
                label: 'Navigate',
                intent: MapIntents.WAYPOINT,
                description: 'Set navigation waypoint'
            },
            {
                id: 'intent_torpedo',
                label: 'Attack',
                intent: MapIntents.TORPEDO,
                description: 'Target for torpedo'
            },
            {
                id: 'intent_mark',
                label: 'Mark',
                intent: MapIntents.MARK,
                description: 'Mark location on map'
            }
        ]
    }
};

/**
 * Gets menu configuration for given type and context
 * @param {string} menuType - 'intent' or 'context'
 * @param {object} squareData - Square data from MapUtils.getSquareData
 * @param {object} context - Additional context (current intent, etc.)
 * @returns {object} Filtered menu config
 */
export function getMenuConfig(menuType, squareData, context = {}) {
    const config = MapMenuConfigs[menuType === 'intent' ? 'intentMenu' : 'contextMenu'];
    if (!config) return null;

    // Filter options based on conditions
    const filteredOptions = config.options.filter(option =>
        !option.condition || option.condition(squareData, context)
    );

    return {
        ...config,
        options: filteredOptions
    };
}