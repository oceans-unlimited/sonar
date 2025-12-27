/**
 * Conn Controller
 * Handles logic for the Captain's scene.
 */
export class ConnController {
    constructor(app, renderer, mapSystem) {
        this.app = app;
        this.renderer = renderer;
        this.mapSystem = mapSystem;
    }

    init() {
        console.log("[ConnController] Initialized.");

        const IS_MOBILE = this.app.screen.width < 800;
        const CONTROLS_WIDTH = IS_MOBILE ? 270 : 300;

        // Correctly calculate map view area (Screen Width - Sidebar Width)
        const viewWidth = this.app.screen.width - CONTROLS_WIDTH;

        // 1. Initialize Map
        this.mapSystem.init({
            width: viewWidth,
            height: this.app.screen.height
        });

        // 2. Attach Logic Interactions
        // Helm Directions
        const helmButtons = this.renderer.views.helmButtons;
        helmButtons.forEach((btn, dir) => {
            btn.on('pointerdown', () => {
                this.handleMove(dir);
            });
        });

        // System Rows (Torpedo/Mine/Vessel)
        const systemRows = this.renderer.views.systemRows;
        systemRows.forEach((row, systemKey) => {
            row.btn1.on('pointerdown', () => this.handleSystemAction(systemKey, 0));
            row.btn2.on('pointerdown', () => this.handleSystemAction(systemKey, 1));
        });
    }

    handleMove(direction) {
        console.log(`[ConnController] Stub: Moving ${direction}`);
        this.mapSystem.controller.sendMove(direction);
    }

    handleSystemAction(system, actionIndex) {
        console.log(`[ConnController] Stub: System ${system} Action ${actionIndex}`);
    }
}
