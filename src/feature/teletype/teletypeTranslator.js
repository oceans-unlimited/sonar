import { Colors } from '../../core/uiStyle.js';

/**
 * Teletype Translator Module
 * Acts as a dictionary for semantic server events to flavor text representations.
 * Designed to be replaced with a database or external JSON in future versions.
 */

const DICTIONARY = {
    'INTERRUPT_START_POSITIONS': {
        resolver: (context) => {
            if (context.role === 'co') {
                return { text: '> [SYS] Select starting sector on tactical map.', color: Colors.primary };
            }
            return { text: '> [SYS] Awaiting Captains to set starting positions.', color: Colors.secondary };
        }
    },
    'DEFAULT_INTERRUPT': {
        resolver: (context) => {
            const msg = context.payload?.message || `System Alert: ${context.type}`;
            return { text: `> [SYS] ${msg}`, color: Colors.warning };
        }
    }
};

export class TeletypeTranslator {
    /**
     * Translates a semantic game event into role-specific flavor text.
     * @param {string} eventKey - The canonical event name (e.g., INTERRUPT_START_POSITIONS)
     * @param {object} context - Context object containing { role, vessel, payload, type }
     * @returns {object|null} - { text, color } or null if no translation exists
     */
    static getTranslation(eventKey, context = {}) {
        const entry = DICTIONARY[eventKey];
        if (entry && entry.resolver) {
            return entry.resolver(context);
        }
        
        // Fallback for uncategorized interrupts
        if (eventKey.startsWith('INTERRUPT_')) {
            return DICTIONARY['DEFAULT_INTERRUPT'].resolver(context);
        }

        return null;
    }
}
