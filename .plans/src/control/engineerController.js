import { BaseController } from './baseController';

export class EngineerController extends BaseController {
    constructor() {
        super();

        console.log('[EngineerController] Initializing handlers...');
        this.isPopulated = false;

        // Action Mapping: Map 'Event Name' -> 'Method'
        this.handlers = {
            ...this.handlers,

            /** 
             * TRIGGER: User clicks a system slot.
             * DATA: { direction: string, slotId: string } 
             * LOGIC: Emits the cross-off action to the server.
             */
            'CROSS_OFF': (d) => this.handleCrossOff(d),
        };
    }

    // --- Hooks ---

    /**
     * Triggered when the scene container is linked to this controller.
     */
    onViewBound() {
        console.log('[EngineerController] View bound. Checking for cached state...');
        this.attemptPopulation();
    }

    /**
     * Triggered every time the server (or Director) broadcasts a new state.
     */
    onGameStateUpdate(state) {
        this.attemptPopulation();
        this.updateEngineView(state);
    }

    /**
     * Internal logic to build the scene once data is ready.
     */
    attemptPopulation() {
        if (this.isPopulated || !this.view || !this.lastState) return;

        console.log('[EngineerController] Initial state received. Populating view...');

        // Support both single sub and multiple submarines state formats
        const submarine = this.lastState.submarines ? this.lastState.submarines[0] : this.lastState;
        const layout = submarine?.engineLayout;

        if (layout && this.view.populate) {
            this.view.populate(layout);
            this.isPopulated = true;
            // Initial view sync
            this.updateEngineView(this.lastState);
        } else {
            console.warn('[EngineerController] Could not find engineLayout in state.');
        }
    }

    /**
     * Phase 4: Interaction Lock & Local Sync
     * Implements the logic from Section 3.4 of engineer.md
     */
    updateEngineView(state) {
        if (!this.isPopulated) return;

        const submarine = state.submarines ? state.submarines[0] : state;
        const engineLayout = submarine?.engineLayout;
        const subState = submarine?.submarineState;
        const subStateData = submarine?.submarineStateData;

        if (!engineLayout) return;

        const isMovedState = subState === 'MOVED';
        const directionMoved = subStateData?.MOVED?.directionMoved;
        const hasCrossedOutThisTurn = subStateData?.MOVED?.engineerCrossedOutSystem;
        const crossedOutSlots = engineLayout.crossedOutSlots || [];

        // Iterate through all registered buttons to sync state and interactivity
        Object.entries(this.buttons).forEach(([id, api]) => {
            const [direction, slotId] = id.split(':');

            // 1. Sync Crossed-Out Visual State
            const isCrossedOut = crossedOutSlots.some(
                slot => slot.direction === direction && slot.slotId === slotId
            );

            if (isCrossedOut) {
                // STATE: DONE / DISABLED
                // Visually crossed out, non-interactive
                api.setEnabled(false);
                api.setInteractive(false);
                api.setActive(false);
            } else {
                // If not crossed out, it is either READY or LOCKED

                // 2. Interaction Lock Logic
                const isMyTurn = isMovedState && !hasCrossedOutThisTurn;
                const isCorrectDirection = direction === directionMoved;

                const isReady = isMyTurn && isCorrectDirection;

                if (isReady) {
                    // STATE: READY / ACTIVE
                    // Interactive, visually active (normal/ready)
                    api.setEnabled(true);
                    api.setInteractive(true);
                    api.setActive(true); // User requested ACTIVE state for ready buttons
                } else {
                    // STATE: LOCKED / IDLE
                    // Non-interactive, visually idle
                    api.setEnabled(true); // Enabled so it renders as IDLE, not DISABLED/CROSS-OUT
                    api.setInteractive(false); // No hover/click
                    api.setActive(false);
                }
            }
        });
    }

    /**
     * Setup role-specific socket listeners.
     */
    onSocketBound() {
        // Accessing raw socket via the manager if available
        // This allows us to listen to role-specific events that aren't proxied by default
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.on('ENGINE_DAMAGE', (data) => this.handleDamage(data));
        }
        console.log('[EngineerController] Socket bound.');
    }

    onSocketUnbound() {
        const rawSocket = this.socket?.socket;
        if (rawSocket) {
            rawSocket.off('ENGINE_DAMAGE');
        }
    }

    // --- Business Logic ---

    /**
     * Phase 5: Deactivate (CrossOut) System
     * Implements the logic from Section 3.5 of engineer.md
     */
    handleCrossOff(data) {
        // Data contains { id, address, isActive }
        // We need to parse direction and slotId from the ID "DIR:SLOT"
        const { id } = data;
        const [direction, slotId] = id.split(':');

        console.log(`[EngineerController] Crossing off: ${direction} ${slotId}`);

        // Emit to server via injected socket (SocketManager)
        if (this.socket) {
            this.socket.crossOffSystem(direction, slotId);
        }

        // Note: We don't update local UI state immediately. 
        // We wait for the server's 'state' broadcast to confirm the action (Phase 6).
    }

    handleDamage({ reactorId }) {
        console.warn(`[EngineerController] DAMAGE RECEIVED: ${reactorId}`);
        // Visual feedback for damage would go here
    }
}
