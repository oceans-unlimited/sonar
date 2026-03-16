import { socketManager } from '../../core/socketManager.js';
import { TeletypeController } from './teletypeController.js';
import TerminalBox from './terminalBox.js';
import { createScrollBehavior } from './teletypeBehaviors.js';

/**
 * TeletypeManager
 * The central entry point for the Teletype feature.
 * Coordinates mounting the terminal UI and provides a simple API for pushing messages.
 */
class TeletypeManager {
    constructor() {
        this.controller = new TeletypeController();
        this.terminal = null;
    }

    /**
     * Mounts the teletype terminal into a container.
     * @param {import('pixi.js').Container} parent - The parent container for the terminal.
     * @param {object} options - Terminal configuration (width, height, maxRows).
     */
    mount(parent, options = {}) {

        // 1. Create the Terminal Visual
        this.terminal = new TerminalBox({
            width: options.width || '100%',
            height: options.height || 120,
            maxRows: options.maxRows || 10,
            typingDelay: options.typingDelay || 30,
            layout: options.layout
        });

        // 2. Add Scroll Behavior
        const scroll = createScrollBehavior(this.terminal);
        this.terminal.on('destroy', () => scroll.destroy());

        // 3. Register with Controller
        this.controller.bindSocket(socketManager);
        this.controller.registerVisual('terminal', this.terminal);

        parent.addChild(this.terminal);

        console.log('[TeletypeManager] Mounted');
    }

    /**
     * Public API to push a message to the terminal.
     * @param {string} text - The message text.
     * @param {object} options - Options (color, role, vessel).
     */
    pushMessage(text, options = {}) {
        // Map 'color' to 'fill' for the internal API if provided
        const pushOptions = { ...options };
        if (options.color) {
            pushOptions.fill = options.color;
        }

        this.controller.pushMessage(text, pushOptions);
    }

    /**
     * Unmounts and cleans up.
     */
    unmount() {
        if (this.controller) {
            this.controller.destroy();
        }

        if (this.terminal) {
            this.terminal.destroy({ children: true });
        }

        this.terminal = null;

        console.log('[TeletypeManager] Unmounted');
    }
}

// Export singleton
export const teletypeManager = new TeletypeManager();
