export class BaseController {
    constructor() {
        this.buttons = {};
        this.visuals = {}; // Registry for non-interactive visual elements (Panels, Sprites)
        this.features = {};     // Injected via bindFeatures
        this.onSceneChange = null; // Callback for scene transitions
        this.lastState = null; // Cache for the most recent game state
        this.view = null; // Reference to the scene's view container
        this.socket = null; // Injected via bindSocket

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

    /**
     * Registers a button API for later control.
     */
    registerButton(id, api) {
        this.buttons[id] = api;
    }

    /**
     * Registers a non-interactive visual element (e.g. Panel, Container) 
     * for state-driven updates (color, visibility).
     */
    registerVisual(id, visualObject) {
        this.visuals[id] = visualObject;
    }

    /**
     * The "Router". Primary Ingress for discrete actions.
     */
    handleEvent(event, data) {
        const handler = this.handlers[event];
        
        // Centralized Logging
        const logMsg = `[Controller] Routing: ${event} | ID: ${data?.id}`;
        console.log(logMsg);
        if (window.logEvent) window.logEvent(logMsg);

        if (handler) {
            handler(data);
        } else {
            console.warn(`[Controller] No handler defined for: ${event}`);
        }
    }

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

    bindView(view) {
        this.view = view;
        this.onViewBound();
    }

    bindFeatures(featureRegistry) {
        // Freeze to prevent mutation of the shared registry
        this.features = Object.freeze({ ...featureRegistry });
        
        // Hook for subclasses
        this.onFeaturesBound();
    }

    // --- Hooks (Override in Subclass) ---
    onSocketBound() {}
    onSocketUnbound() {}
    onViewBound() {}
    onFeaturesBound() {} 
    onGameStateUpdate(state) {}

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
        this.lastState = state;
        // Pass state to current scene controller's hook
        this.onGameStateUpdate(state);
    }

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
