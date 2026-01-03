import { Colors } from "../../core/uiStyle.js";

/**
 * Maps interrupt state to visual UI configurations.
 * This keeps logic out of the renderer.
 */
export function getInterruptUIOptions(interrupt, isReady) {
    const type = interrupt.type;
    const payload = interrupt.payload || {};

    // Default configuration
    let options = {
        type: type,
        title: type.replace(/_/g, ' '),
        message: payload.message || "Please wait...",
        availableButtons: [],
        buttonOverrides: {},
        isReady: isReady
    };

    // Specialized PAUSE configuration
    if (type === 'PAUSE' || options.title.toUpperCase().includes('PAUSE')) {
        options.title = "GAME PAUSED";
        options.message = "Click ready to resume...";
        options.availableButtons = ['pause', 'abort', 'surrender'];
        options.showReadyIndicator = true;
        options.buttonOverrides = {
            pause: { label: "READY", color: Colors.text },
            abort: { label: "QUIT", color: 0xdc2626 },
            surrender: { label: "SURRENDER", color: 0x991b1b }
        };
    } else if (type === 'PLAYER_DISCONNECT') {
        options.title = "PLAYER DISCONNECT";
        options.message = "Waiting for reconnection...";
        options.showReadyIndicator = true;
    }

    return options;
}
