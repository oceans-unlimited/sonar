/**
 * Base Controller
 * Provides shared patterns for event routing, button/visual registration,
 * socket binding, and lifecycle hooks.
 */

export class BaseController {
    constructor() {
        this.view = null; // Reference to the scene's view container
        this.socket = null; // Injected via bindSocket

        // Registries
        this.buttons = {};   // Registry for button objects
        this.visuals = {};   // Registry for visual objects
        this.features = {};  // Registry for feature objects

        this.onSceneChange = null; // Callback for scene transitions
        this.lastState = null; // Cache for the most recent game state

        // Action Mapping: Map 'Event Name' -> 'Method'
        // Using bind(this) to ensure correct context when called
        this.handlers = {
            /**
             * TRIGGER: 'Master' toggle or Disconnect event.
             * DATA: { id: string|null, isActive: boolean }
             * LOGIC: isActive=true -> Disable all others (Lockdown). 
             *        isActive=false -> Enable all others (Normal).
             */
            'ISOLATE_SYSTEM': (d) => this.handleSystemIsolation(d),

            // Backward compatibility for the 'DEACTIVATE_ALL' event string
            // until blueprints are updated
            'DEACTIVATE_ALL': (d) => this.handleSystemIsolation(d),

            'SWAP_BACK': () => {
                if (this.onSceneChange) this.onSceneChange('primary');
            }
        };

        console.log(`BaseController initialized.`);
    }

    // ─────────── View Binding ───────────

    /**
     * Called by SceneManager after scene creation.
     * @param {import('pixi.js').Container} view - The scene container
     */
    bindView(view) {
        this.view = view;
        this.onViewBound(view);
    }

    // ─────────── Registration ───────────

    /**
     * Register a wired button's control API.
     * @param {string} id - Unique button identifier
     * @param {object} controlAPI - The return value of wireButton()
     */
    registerButton(id, api) {
        this.buttons[id] = api;
    }

    /**
     * Registers a non-interactive visual element (e.g. Panel, Container) 
     * for state-driven updates (color, visibility).
     * @param {string} id - Visual identifier
     * @param {object} displayObject - Any PixiJS display object
     */
    registerVisual(id, displayObject) {
        this.visuals[id] = displayObject;
    }

    // ─────────── Event Routing ───────────

    /**
     * Central event handler. Routes to the correct handler function.
     * @param {string} eventType - Event type key
     * @param {*} payload - Event data
     */

    handleEvent(eventType, payload) {
        const handler = this.handlers[eventType];

        // Centralized Logging
        const logMsg = `[Controller] Routing: ${eventType} | ID: ${payload?.id}`;
        console.log(logMsg);
        if (window.logEvent) window.logEvent(logMsg);

        if (handler) {
            handler.call(this, payload);
        } else {
            console.warn(`[${this.constructor.name}] Unhandled event: ${eventType}`, payload);
        }
    }

    // ─────────── Socket Helpers ───────────

    /**
     * Dependency Injection: Socket
     */
    bindSocket(socket) {
        this.socket = socket;

        this.socket.on('stateUpdate', (state) => this.handleGameState(state));
        this.socket.on('disconnect', () => this.handleDisconnect());

        // Initialize with cached state if available
        if (this.socket.lastState) {
            this.lastState = this.socket.lastState;
        }

        // Hook for subclasses
        this.onSocketBound();
    }

    bindFeatures(featureRegistry) {
        // Freeze to prevent mutation of the shared registry
        this.features = Object.freeze({ ...featureRegistry });

        // Hook for subclasses
        this.onFeaturesBound();
    }

    // ─────────── Lifecycle Hooks (override in subclass) ───────────

    onSocketBound() { }
    onSocketUnbound() { }
    onViewBound() { }
    onFeaturesBound() { }
    onGameStateUpdate(state) { }

    // --- Global Logic ---

    handleSystemIsolation({ id, isActive }) {
        console.log(`[BaseController] System Isolation: ${isActive ? 'LOCKDOWN' : 'NORMAL'}`);
        Object.keys(this.buttons).forEach(btnId => {
            if (btnId !== id) this.buttons[btnId].setEnabled(!isActive);
        });
    }

    handleDisconnect() {
        console.warn('[BaseController] Socket disconnected. Initiating Lockdown.');
        this.handleSystemIsolation({ id: null, isActive: true });
    }

    handleGameState(state) {
        if (!this.socket) return;
        this.lastState = state;
        // Pass state to current scene controller's hook
        this.onGameStateUpdate(state);
    }

    /**
     * Handles commands from the Director mode.
     * @param {object} cmd - The director command
     */
    handleDirectorCmd(cmd) {
        console.log(`[${this.constructor.name}] Director command:`, cmd);
        if (cmd.type === 'stateUpdate') {
            this.onGameStateUpdate(cmd.payload);
        } else if (cmd.type && this.handlers[cmd.type]) {
            // Support generic event routing for commands like 'TOGGLE_HEADER'
            this.handleEvent(cmd.type, cmd.payload);
        }
    }

    // ─────────── Cleanup ───────────

    destroy() {
        console.log(`BaseController destroyed.`);
        if (this.socket) {
            this.socket.off('stateUpdate', this.handleGameState);
            this.socket.off('disconnect', this.handleDisconnect);
            this.onSocketUnbound();
            this.socket = null;
        }
        this.features = {};
        this.buttons = {};
        this.visuals = {};
    }
}
