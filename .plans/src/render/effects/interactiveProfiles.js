import { visuals } from './visuals';
import { INTERACTIVE_STATES } from '../../behavior/constants';

/**
 * Profiles define how a button looks in each state.
 * They use the "dumb" manipulators from visuals.js.
 */
export const PROFILES = {
    basic: {
        [INTERACTIVE_STATES.IDLE]: (t) => {
            visuals.setScale(t, 1);
            visuals.setAlpha(t, 1);
            visuals.setTint(t, t.initialColor || 0xFFFFFF);
        },
        [INTERACTIVE_STATES.HOVER]: (t) => {
            visuals.setScale(t, 1.1);
        },
        [INTERACTIVE_STATES.PRESSED]: (t) => {
            visuals.setScale(t, 0.95);
        },
        [INTERACTIVE_STATES.DISABLED]: (t) => {
            visuals.setAlpha(t, 0.5);
            visuals.setScale(t, 1);
        },
        [INTERACTIVE_STATES.ACTIVE]: (t) => {
            visuals.setScale(t, 1.05);
            // visuals.setTint(t, 0xFFFF00); // Yellow highlight example
        }
    },

    frame: {
        [INTERACTIVE_STATES.IDLE]: (t) => {
            visuals.setAlpha(t, 1);
            visuals.toggleOverlay(t, false);
            // visuals.setOverlayAlpha(t, 0.1);
            visuals.setScale(t, 1);
        },
        [INTERACTIVE_STATES.HOVER]: (t) => {
            visuals.setOverlayAlpha(t, 0.4);            
            visuals.toggleOverlay(t, true);
        },
        [INTERACTIVE_STATES.PRESSED]: (t) => {
            visuals.toggleOverlay(t, true);
            visuals.setOverlayAlpha(t, 0.7); // Higher alpha for press
        },
        [INTERACTIVE_STATES.DISABLED]: (t) => {
            visuals.setAlpha(t, 0.5);
            visuals.toggleOverlay(t, false);
        },
        [INTERACTIVE_STATES.ACTIVE]: (t) => {
            visuals.toggleOverlay(t, true);
            visuals.setTint(t, 0xFFFFFF);
            // visuals.setOverlayAlpha(t, 0.4);
            visuals.setScale(t, 1.02);
        }
    },

    circuit: {
        [INTERACTIVE_STATES.IDLE]: (t) => {
            // LOCKED STATE (No Interaction)
            visuals.setAlpha(t, 1);
            visuals.toggleTag(t, false);
            visuals.setScale(t, 1);
            visuals.setTint(t, t.initialColor || 0xFFFFFF); // Normal color
        },
        [INTERACTIVE_STATES.HOVER]: (t) => {
            // Interaction Feedback
            visuals.setScale(t, 1.05);
        },
        [INTERACTIVE_STATES.PRESSED]: (t) => {
            visuals.setScale(t, 0.95);
        },
        [INTERACTIVE_STATES.DISABLED]: (t) => {
            // DONE/CROSSED OUT STATE
            visuals.setAlpha(t, 0.4);
            visuals.toggleTag(t, true); // Show 'X' or tag
            visuals.setScale(t, 1);
        },
        [INTERACTIVE_STATES.ACTIVE]: (t) => {
            // READY STATE (Interactive)
            visuals.setAlpha(t, 1);
            visuals.toggleTag(t, false);
            visuals.setScale(t, 1.05); // Slight pulse/scale to show ready
            // Optional: Glow or highlight could go here
        }
    },

    reactor: {
        [INTERACTIVE_STATES.IDLE]: (t) => {
            // LOCKED STATE
            visuals.setAlpha(t, 1);
            visuals.toggleTag(t, false);
            visuals.setScale(t, 1);
        },
        [INTERACTIVE_STATES.HOVER]: (t) => {
            visuals.setScale(t, 1.05);
        },
        [INTERACTIVE_STATES.PRESSED]: (t) => {
            visuals.setScale(t, 0.95);
        },
        [INTERACTIVE_STATES.DISABLED]: (t) => {
            // DONE/CROSSED OUT STATE
            visuals.setScale(t, 1);
            visuals.setAlpha(t, 0.5);
            visuals.toggleTag(t, true);
        },
        [INTERACTIVE_STATES.ACTIVE]: (t) => {
            // READY STATE
            visuals.toggleTag(t, false);
            visuals.setScale(t, 1.05);
        }
    },

    info: {
        [INTERACTIVE_STATES.IDLE]: (t) => {
            visuals.setAlpha(t, 0.8);
            visuals.setScale(t, 1);
        },
        [INTERACTIVE_STATES.HOVER]: (t) => {
            visuals.setAlpha(t, 1);
            visuals.setScale(t, 1.1);
        },
        [INTERACTIVE_STATES.PRESSED]: (t) => {
            visuals.setScale(t, 0.9);
        },
        [INTERACTIVE_STATES.DISABLED]: (t) => {
            visuals.setAlpha(t, 0.3);
        },
        [INTERACTIVE_STATES.ACTIVE]: (t) => {
            visuals.setAlpha(t, 1);
            visuals.setScale(t, 1.05);
        }
    }
};
