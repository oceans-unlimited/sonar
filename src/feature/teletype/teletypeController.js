import { BaseController } from '../../control/baseController';
import { Colors } from '../../core/uiStyle.js';

/**
 * TeletypeController manages the teletype feature, handling message ingestion,
 * filtering based on game state, and coordinating the teletype display.
 * 
 * Messages are auto-typed on push — no separate TYPE_NEXT_LINE needed.
 */
export class TeletypeController extends BaseController {
    constructor() {
        super();

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
        const terminal = this.visuals['terminal'];
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
    }

    onSocketUnbound() {
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.off('PUSH_TEST_MESSAGE');
        }
    }

    onGameStateUpdate(state) {
        // Future: automated log dumps or state-driven alerts
    }
}
