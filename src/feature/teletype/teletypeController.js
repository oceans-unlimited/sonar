import { BaseController } from '../../control/baseController';
import { Colors } from '../../core/uiStyle.js';
import { TeletypeTranslator } from './teletypeTranslator.js';
import { submarine } from '../submarine/submarine.js';

/**
 * TeletypeController manages the teletype feature, handling message ingestion,
 * filtering based on game state, and coordinating the teletype display.
 * 
 * Messages are auto-typed on push — no separate TYPE_NEXT_LINE needed.
 */
export class TeletypeController extends BaseController {
    constructor() {
        super();
        this._cachedInterrupt = null;
        this._onStateChanged = null;

        this.handlers = {
            ...this.handlers,
            'PUSH_TEST_MESSAGE': (data) => this.pushMessage(data.text, data.options)
        };
    }

    /**
     * Public API for other controllers/systems to push messages.
     * @param {string} text - The message text.
     * @param {Object} options - Filtering (role, vessel) and style overrides (fill, alpha, etc.)
     */
    pushMessage(text, options = {}) {
        const { role, vessel, ...styleOverrides } = options;
        const state = this.lastState || {};
        const playerId = this.socket?.playerId;

        // --- Smart Filtering ---
        if (playerId && (role || vessel)) {
            const mySub = state.submarines?.find(s =>
                s.co === playerId || s.xo === playerId || s.sonar === playerId || s.eng === playerId
            );

            if (mySub) {
                if (vessel && mySub.id !== vessel) {
                    console.log(`[Teletype] Filtered message for vessel: ${vessel}`);
                    return;
                }

                if (role) {
                    const myRole = Object.keys(mySub).find(k => mySub[k] === playerId);
                    if (myRole !== role) {
                        console.log(`[Teletype] Filtered message for role: ${role}`);
                        return;
                    }
                }
            }
        }

        // Set default fill if none provided
        if (!styleOverrides.fill) {
            styleOverrides.fill = Colors.text;
        }

        // Auto-detect warning based on content
        if (styleOverrides.fill === Colors.text && text.includes('[Warning]')) {
            styleOverrides.fill = Colors.warning;
        }

        // appendLine now auto-types immediately
        const terminal = this.visuals.get('terminal');
        if (terminal && typeof terminal.appendLine === 'function') {
            terminal.appendLine(text, styleOverrides);
        }
    }

    onSocketBound() {
        console.log('[TeletypeController] Socket bound.');
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.on('PUSH_TEST_MESSAGE', (d) => this.handleEvent('PUSH_TEST_MESSAGE', d));
        }

        // Subscribe to submarine state changes for state-driven teletype messages.
        // Uses the submarine singleton directly (feature-to-feature pattern, like DamageController).
        this._onStateChanged = (data) => this._handleSubStateChanged(data);
        submarine.on('submarine:stateChanged', this._onStateChanged);
    }

    onSocketUnbound() {
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.off('PUSH_TEST_MESSAGE');
        }

        // Cleanup submarine listener
        if (this._onStateChanged) {
            submarine.off('submarine:stateChanged', this._onStateChanged);
            this._onStateChanged = null;
        }
    }

    onGameStateUpdate(state) {
        if (!state) return;

        const newInterrupt = state.activeInterrupt;
        const oldInterrupt = this._cachedInterrupt;

        // Detect new interrupts that just appeared in the state
        if (newInterrupt && (!oldInterrupt || oldInterrupt.type !== newInterrupt.type)) {
            this._handleNewInterruptLog(state, newInterrupt);
        }

        this._cachedInterrupt = newInterrupt;
    }

    _handleNewInterruptLog(state, interrupt) {
        const playerId = this.socket?.playerId;
        const mySub = state.submarines?.find(s =>
            s.co === playerId || s.xo === playerId || s.sonar === playerId || s.eng === playerId
        );
        const myRole = mySub ? Object.keys(mySub).find(k => mySub[k] === playerId) : null;

        const context = {
            role: myRole,
            vessel: mySub?.id,
            payload: interrupt.payload,
            type: interrupt.type
        };

        const translation = TeletypeTranslator.getTranslation(`INTERRUPT_${interrupt.type}`, context);
        if (translation) {
            this.pushMessage(translation.text, { color: translation.color });
        }
    }

    /**
     * Handles submarine state change events from the submarine singleton.
     * Translates state transitions into role-filtered teletype messages.
     * @param {object} data - { id, state, previous }
     */
    _handleSubStateChanged(data) {
        const playerId = this.socket?.playerId;
        if (!playerId) return;

        // Only process state changes for ownship
        const ownship = submarine.getOwnship();
        if (!ownship || data.id !== ownship.getId()) return;

        const myRole = submarine.getLocalRole();
        const movedData = ownship.getStateData('MOVED');

        const context = {
            role: myRole,
            vessel: data.id,
            payload: {
                previous: data.previous,
                direction: movedData?.directionMoved
            },
            type: data.state
        };

        const eventKey = `SUB_STATE_${data.state}`;
        const translation = TeletypeTranslator.getTranslation(eventKey, context);
        if (translation) {
            this.pushMessage(translation.text, { fill: translation.color });
        }
    }
}
