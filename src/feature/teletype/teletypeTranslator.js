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
    },

    // ─────────── Submarine State Transitions ───────────

    'SUB_STATE_MOVED': {
        resolver: (context) => {
            const dir = context.payload?.direction || '?';
            switch (context.role) {
                case 'co':
                    return { text: `> [HELM] Heading ${dir} confirmed. Awaiting crew confirmation...`, color: Colors.secondary };
                case 'eng':
                    return { text: `> [ENG] Cross-off required: ${dir} systems.`, color: Colors.warning };
                case 'xo':
                    return { text: `> [XO] Charge a subsystem gauge.`, color: Colors.warning };
                default:
                    return { text: `> [NAV] Vessel moving ${dir}. Crew responding.`, color: Colors.secondary };
            }
        }
    },
    'SUB_STATE_SUBMERGED': {
        resolver: (context) => {
            if (context.payload?.previous === 'MOVED') {
                return { text: '> [SYS] All stations confirmed. Vessel submerged.', color: Colors.primary };
            }
            if (context.payload?.previous === 'SURFACED') {
                return { text: '> [SYS] Dive complete. Vessel submerged — all systems nominal.', color: Colors.primary };
            }
            return null; // Suppress for initial state / no-op transitions
        }
    },
    'SUB_STATE_SURFACING': {
        resolver: (context) => {
            switch (context.role) {
                case 'co':
                    return { text: '> [ALERT] EMERGENCY SURFACE initiated. Complete trace protocol.', color: Colors.danger };
                default:
                    return { text: '> [ALERT] SURFACING — standby for crew task sequence.', color: Colors.danger };
            }
        }
    },
    'SUB_STATE_SURFACED': {
        resolver: () => {
            return { text: '> [SYS] Vessel surfaced. Systems repaired. Awaiting dive order.', color: Colors.warning };
        }
    },
    'SUB_STATE_DESTROYED': {
        resolver: () => {
            return { text: '>>> HULL BREACH: VESSEL LOST <<<', color: Colors.danger };
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
