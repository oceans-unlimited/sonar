import { MapRenderer } from './MapRenderer.js';
import { MapController } from './MapController.js';
import { attachMapBehaviors } from './mapBehaviors.js';

/**
 * Map System Facade
 * Provides a simple API for scenes to mount and interact with the Map feature.
 */
export class MapSystem {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;
        this.renderer = new MapRenderer(app, assets);
        this.controller = new MapController(app, this.renderer);
        this.behaviors = attachMapBehaviors(app, this.controller);

        this.container = this.renderer.container;
    }

    init(config = {}) {
        const { width, height, center = { x: 7, y: 7 } } = config;
        this.controller.resize(width, height);
        this.controller.centerOnPosition(center);
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
        if (this.container) {
            this.container.destroy({ children: true });
        }
    }
}
