import * as PIXI from 'pixi.js';
import { MapRenderer } from './MapRenderer.js';
import { MapController } from './MapController.js';
import { attachMapBehaviors } from './mapBehaviors.js';

/**
 * Map System Facade
 * Provides a simple API for scenes to mount and interact with the Map feature.
 */
export class MapSystem {
    constructor(app, assets, config = {}) {
        this.app = app;
        this.assets = assets;
        this.renderer = new MapRenderer(app, assets, config);
        this.controller = new MapController(app, this.renderer, null, this.assets);
        this.behaviors = attachMapBehaviors(app, this.controller);

        // Link behaviors back to controller if needed
        this.controller.behaviors = this.behaviors;

        this.container = this.renderer.container;
    }

    init(config = {}) {
        const { width, height, viewConfig } = config;

        if (viewConfig) {
            this.controller.setViewConfig(viewConfig);
        }

        this.controller.resize(width, height);

        // Center on current ownship position (from controller's state)
        const ownshipCenter = new PIXI.Point(
            this.controller.ownship.col,
            this.controller.ownship.row
        );
        this.controller.centerOnPosition(ownshipCenter);
    }

    /**
     * Updates the map's visual configuration (grid, sectors, labels, HUD)
     * @param {object} config 
     */
    setViewConfig(config) {
        this.controller.setViewConfig(config);
    }

    show() {
        this.container.visible = true;
    }

    hide() {
        this.container.visible = false;
    }

    resize(width, height) {
        this.controller.resize(width, height);
    }

    updateViewport(width, height) {
        this.controller.resize(width, height);
    }

    destroy() {
        if (this.controller) this.controller.destroy();
        if (this.renderer) this.renderer.destroy();
        if (this.container) {
            this.container.destroy({ children: true });
        }
    }

}
