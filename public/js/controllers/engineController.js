/**
 * Engine Controller
 * Handles logic for the Engineer scene.
 */
export class EngineController {
    constructor(app, renderer) {
        this.app = app;
        this.renderer = renderer;
        this.pushedButtons = new Set(); // Set of "direction_slotId"
    }

    init() {
        console.log("[EngineController] Initialized.");
    }

    handleButtonPress(direction, slotId, system) {
        const key = `${direction}_${slotId}`;
        console.log(`[EngineController] Button pressed: ${key} (${system})`);

        if (!this.pushedButtons.has(key)) {
            this.pushedButtons.add(key);

            // Stub socket call
            console.log(`[EngineController] Stub: Pushing button ${key}`);

            // Logic for circuit completion check should move here
            this.checkCircuitCompletion(direction, slotId);
        }
    }

    checkCircuitCompletion(direction, slotId) {
        // This will require the engineLayout data
        console.log("[EngineController] Checking circuit completion (requires layout data)");
    }

    resetAll() {
        this.pushedButtons.clear();
        console.log("[EngineController] Resetting all buttons (Local)");
    }

    // Server-side stubs
    handleDirectionChange(direction) {
        console.log(`[EngineController] Stub: Received direction change: ${direction}`);
        this.renderer.views.directionTemplates.forEach((template, dir) => {
            template.updateDirectionState(dir === direction);
        });
    }
}
