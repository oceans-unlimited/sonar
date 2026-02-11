/**
 * Base Controller
 * Provides shared patterns for event routing, button/visual registration,
 * socket binding, and lifecycle hooks.
 */

export class BaseController {
    constructor(socketManager, sceneManager) {
        this.socketManager = socketManager;
        this.sceneManager = sceneManager;
        this.view = null;

        // Registries
        this.buttons = new Map();   // id → wired button control API
        this.visuals = new Map();   // id → display object reference

        // Handler map — subclasses populate this
        this.handlers = {};

        // Socket listener references for cleanup
        this._socketListeners = [];
    }

    // ─────────── View Binding ───────────

    /**
     * Called by SceneManager after scene creation.
     * @param {import('pixi.js').Container} view - The scene container
     */
    bindView(view) {
        this.view = view;
    }

    // ─────────── Registration ───────────

    /**
     * Register a wired button's control API.
     * @param {string} id - Unique button identifier
     * @param {object} controlAPI - The return value of wireButton()
     */
    registerButton(id, controlAPI) {
        this.buttons.set(id, controlAPI);
    }

    /**
     * Register a display object for later updates.
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
        if (handler) {
            handler.call(this, payload);
        } else {
            console.warn(`[${this.constructor.name}] Unhandled event: ${eventType}`, payload);
        }
    }

    // ─────────── Socket Helpers ───────────

    /**
     * Listen to a socket event with automatic cleanup tracking.
     * @param {string} event
     * @param {function} callback
     */
    onSocket(event, callback) {
        this.socketManager.on(event, callback);
        this._socketListeners.push({ event, callback });
    }

    // ─────────── Lifecycle Hooks (override in subclass) ───────────

    /**
     * Called after the view is bound and added to stage.
     * @param {import('pixi.js').Container} view
     */
    onViewBound(view) {
        // Override in subclass
    }

    /**
     * Called when a game state update arrives.
     * @param {object} state - The game state
     */
    onGameStateUpdate(state) {
        // Override in subclass
    }

    // ─────────── Cleanup ───────────

    destroy() {
        // Unbind socket listeners
        for (const { event, callback } of this._socketListeners) {
            this.socketManager.off(event, callback);
        }
        this._socketListeners = [];

        // Destroy all wired buttons
        for (const [id, ctrl] of this.buttons) {
            if (typeof ctrl.destroy === 'function') ctrl.destroy();
        }
        this.buttons.clear();
        this.visuals.clear();
        this.view = null;
    }
}
