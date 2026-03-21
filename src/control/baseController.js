import { EventEmitter } from 'pixi.js';

/**
 * Base Controller
 * Provides shared patterns for event routing, button/visual registration,
 * socket binding, and lifecycle hooks.
 */

export class BaseController extends EventEmitter {
    constructor() {
        super();
        this.view = null; // Reference to the scene's view container
        this.socket = null; // Injected via bindSocket
        this._socketListeners = new Map(); // Track listeners for cleanup
        this._featureListeners = new Map(); // Track { feature, event, handler } for cleanup

        // Registries
        this.buttons = new Map();   // Registry for button objects
        this.visuals = new Map();   // Registry for visual objects
        this.features = new Map();  // Registry for feature objects

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
            },

            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d)
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
        this.buttons.set(id, api);
    }

    /**
     * Unregisters a button and cleans up its behavior.
     * @param {string} id - Unique button identifier
     */
    unregisterButton(id) {
        const api = this.buttons.get(id);
        if (api && typeof api.destroy === 'function') {
            api.destroy();
        }
        this.buttons.delete(id);
    }

    /**
     * Registers a non-interactive visual element (e.g. Panel, Container) 
     * for state-driven updates (color, visibility).
     * @param {string} id - Visual identifier
     * @param {object} displayObject - Any PixiJS display object
     */
    registerVisual(id, displayObject) {
        this.visuals.set(id, displayObject);
    }

    // ─────────── Event Routing ───────────

    /**
     * Central event handler. Routes to the correct handler function.
     * @param {string} eventType - Event type key
     * @param {*} payload - Event data
     */

    handleEvent(eventType, payload) {
        const handler = this.handlers[eventType];

        // Disambiguate between client-side-only events and controller intents
        const prefix = payload?.isClientOnly ? '[Client]' : '[Controller]';
        const logMsg = `${prefix} Routing: ${eventType} | ID: ${payload?.id || 'anonymous'}`;

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

        const stateHandler = (state) => this.handleGameState(state);
        const disconnectHandler = () => this.handleDisconnect();

        this.socket.on('stateUpdate', stateHandler);
        this.socket.on('disconnect', disconnectHandler);

        this._socketListeners.set('stateUpdate', stateHandler);
        this._socketListeners.set('disconnect', disconnectHandler);

        // Agnostic event binding: Map all registered handlers to socket events
        Object.keys(this.handlers).forEach(event => {
            const handler = (data) => this.handleEvent(event, data);
            this.socket.on(event, handler);
            this._socketListeners.set(event, handler);
        });

        // Initialize with cached state if available
        if (this.socket.lastState) {
            this.lastState = this.socket.lastState;
        }

        // Hook for subclasses
        this.onSocketBound();
    }

    bindFeatures(featureRegistry) {
        // We convert the incoming object to our Map
        Object.entries(featureRegistry).forEach(([key, val]) => {
            this.features.set(key, val);
        });

        // Hook for subclasses
        this.onFeaturesBound();
    }

    /**
     * Safe subscription to a persistent feature. 
     * Automatically tracked for cleanup when the controller is destroyed.
     * @param {string} featureKey - Key in this.features
     * @param {string} event - Event name
     * @param {Function} handler - Callback function
     */
    subscribeToFeature(featureKey, event, handler) {
        const feature = this.features.get(featureKey);
        if (!feature) {
            console.warn(`[BaseController] Feature not found for subscription: ${featureKey}`);
            return;
        }

        if (typeof feature.on !== 'function') {
            console.warn(`[BaseController] Feature ${featureKey} does not support .on() events.`);
            return;
        }

        // Apply listener
        feature.on(event, handler);

        // Store for cleanup
        if (!this._featureListeners.has(featureKey)) {
            this._featureListeners.set(featureKey, []);
        }
        this._featureListeners.get(featureKey).push({ event, handler });
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
        this.buttons.forEach((api, btnId) => {
            if (btnId !== id) api.setEnabled(!isActive);
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
        console.log(`[${this.constructor.name}] Destroying...`);

        // 1. Cleanup Socket Listeners
        if (this.socket) {
            this._socketListeners.forEach((handler, event) => {
                this.socket.off(event, handler);
            });
            this._socketListeners.clear();
            this.onSocketUnbound();
            this.socket = null;
        }

        // 2. Cleanup Feature Listeners
        this._featureListeners.forEach((listeners, featureKey) => {
            const feature = this.features.get(featureKey);
            if (feature && typeof feature.off === 'function') {
                listeners.forEach(({ event, handler }) => {
                    feature.off(event, handler);
                });
            }
        });
        this._featureListeners.clear();

        // 3. Clear Registries
        this.features.clear();
        this.buttons.clear();
        this.visuals.clear();
    }
}
