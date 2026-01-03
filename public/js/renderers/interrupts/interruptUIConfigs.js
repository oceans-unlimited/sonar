import { Colors } from "../../core/uiStyle.js";

/**
 * Maps interrupt state to visual UI configurations.
 * This keeps logic out of the renderer.
 */
export function getInterruptUIOptions(interrupt, isReady, playerRole) {
    const type = interrupt.type;
    const payload = interrupt.payload || {};

    // Default configuration
    let options = {
        type: type,
        title: type.replace(/_/g, ' '),
        message: payload.message || "Please wait...",
        availableButtons: [],
        buttonOverrides: {},
        isReady: isReady,
        showReadyIndicator: false
    };

    // PAUSE & PLAYER_DISCONNECT (Out-of-Game)
    if (type === 'PAUSE' || type === 'PLAYER_DISCONNECT') {
        options.title = type === 'PAUSE' ? "GAME PAUSED" : "PLAYER DISCONNECT";
        options.message = type === 'PAUSE' ? "Click ready to resume..." : "Waiting for reconnection...";
        options.availableButtons = ['pause', 'abort', 'surrender'];
        options.showReadyIndicator = true;
        options.buttonOverrides = {
            pause: { label: isReady ? "READY" : "WAITING", color: isReady ? 0x00ff00 : Colors.text },
            abort: { label: "QUIT", color: 0xdc2626 },
            surrender: { label: "SURRENDER", color: 0x991b1b }
        };
    }
    // SONAR_PING (In-Game)
    else if (type === 'SONAR_PING') {
        const isTx = payload.txSubId === payload.playerSubId;
        const isCaptain = playerRole === 'co';

        if (!isTx && isCaptain) {
            options.title = "SONAR PING DETECTED";
            options.message = "Choose one TRUE and one FALSE attribute to reveal.";
            options.availableButtons = ['submit']; // Mocked coordinate selection button
            options.buttonOverrides = {
                submit: { label: "SUBMIT RESPONSE", color: 0x3b82f6 }
            };
        } else if (isTx) {
            options.title = "SONAR PING TRANSMITTING";
            options.message = payload.response ? `RECEIVED: ${payload.response}` : "Waiting for response...";
        } else {
            options.title = "SONAR PING";
            options.message = "Receiving Captain is responding...";
        }
    }
    // START_POSITIONS (In-Game)
    else if (type === 'START_POSITIONS') {
        const isCaptain = playerRole === 'co';
        options.title = "SELECT STARTING POSITION";
        if (isCaptain) {
            options.message = "Choose your starting coordinates on the map.";
            options.availableButtons = ['pause'];
            options.buttonOverrides = {
                pause: { label: isReady ? "CONFIRMED" : "CONFIRM POSITION", color: isReady ? 0x00ff00 : 0x3b82f6 }
            };
        } else {
            options.message = "Captains are choosing starting positions...";
        }
    }
    // TORPEDO_RESOLUTION & SCENARIO_ACTION (In-Game, Visual only)
    else if (type === 'TORPEDO_RESOLUTION' || type === 'SCENARIO_ACTION') {
        options.title = type === 'TORPEDO_RESOLUTION' ? "TORPEDO ENGAGEMENT" : "SCENARIO EVENT";
        // Message usually comes from payload
    }

    return options;
}

