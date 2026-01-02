import * as PIXI from 'pixi.js';
import { MapConstants } from './mapConstants.js';
import { animateMapZoom } from './mapEffects.js';

/**
 * Map Controller
 * Coordinates map state, renderer, and behaviors.
 * Stubbed/Mocked server interaction per user request.
 */
export class MapController {
    constructor(app, renderer, behaviors) {
        this.app = app;
        this.renderer = renderer;
        this.behaviors = behaviors;

        this.targetPos = new PIXI.Point(7, 7); // Default center
        this.zoomLevels = [90, 60, 30];

        this.init();
    }

    init() {
        // Stub: Server state sync
        console.log("[MapController] Initialized. Server sync stubbed.");

        this.renderer.renderMap();
        this.renderer.clampPosition();
    }

    resize(width, height) {
        this.renderer.setViewport(0, 0, width, height);

        const columns = MapConstants.GRID_SIZE;
        const availableWidth = width - MapConstants.LABEL_GUTTER;
        const minScale = Math.floor(availableWidth / columns);

        const intermediate = Math.floor((MapConstants.DEFAULT_SCALE + minScale) / 2);
        this.zoomLevels = [MapConstants.DEFAULT_SCALE, intermediate, minScale];

        if (this.renderer.currentScale < minScale) {
            this.renderer.currentScale = minScale;
            this.renderer.renderMap();
        }
        this.renderer.clampPosition();
    }

    setZoom(targetScale) {
        animateMapZoom(this.app, this.renderer, targetScale, MapConstants.ZOOM_ANIMATION_DURATION);
    }

    stepZoom(direction) {
        const closest = this.findClosestLevel(this.renderer.currentScale);
        const currentIndex = this.zoomLevels.indexOf(closest);
        let nextIndex = currentIndex - direction; // direction 1 is zoom in (index decreases)

        nextIndex = Math.max(0, Math.min(this.zoomLevels.length - 1, nextIndex));
        if (nextIndex !== currentIndex) {
            this.setZoom(this.zoomLevels[nextIndex]);
        }
    }

    findClosestLevel(scale) {
        return this.zoomLevels.reduce((prev, curr) => {
            return (Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev);
        });
    }

    centerOnPosition(pos = this.targetPos) {
        this.targetPos = pos;

        const centerX = this.renderer.maskWidth / 2 + MapConstants.LABEL_GUTTER;
        const centerY = this.renderer.maskHeight / 2 + MapConstants.LABEL_GUTTER;

        const mapX = pos.x * this.renderer.currentScale + this.renderer.currentScale / 2;
        const mapY = pos.y * this.renderer.currentScale + this.renderer.currentScale / 2;

        const targetX = centerX - mapX;
        const targetY = centerY - mapY;

        // Smooth transition
        const ease = 0.1;
        const centerTicker = () => {
            if (!this.renderer.container || this.renderer.container.destroyed) {
                this.app.ticker.remove(centerTicker);
                return;
            }

            const dx = targetX - this.renderer.mapContent.x;
            const dy = targetY - this.renderer.mapContent.y;

            if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                this.renderer.mapContent.x = targetX;
                this.renderer.mapContent.y = targetY;
                this.renderer.clampPosition();
                this.app.ticker.remove(centerTicker);
            } else {
                this.renderer.mapContent.x += dx * ease;
                this.renderer.mapContent.y += dy * ease;
                this.renderer.clampPosition();
            }
        };

        this.app.ticker.add(centerTicker);
    }

    // Server-side interaction stubs
    sendMove(direction) {
        console.log(`[MapController] Requesting move: ${direction}`);
        // socketManager.move(direction) would go here
    }
}
