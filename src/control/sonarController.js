import { BaseController } from './baseController';

/**
 * SonarController
 * Handles logic for the Sonar station.
 * Focuses on enemy sub movement tracking and teletype communication.
 */
export class SonarController extends BaseController {
    constructor() {
        super();
        
        // Action Mapping
        this.handlers = {
            ...this.handlers,
            'CENTER_ON_OWNSHIP': () => this.centerMap()
            // Add other map-related UI handlers here later
        };
    }

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[SonarController] View bound.');
    }

    onFeaturesBound() {
        super.onFeaturesBound();
        console.log('[SonarController] Features bound.');

        // Internal alias for cleaner access to map feature
        this.map = this.features.get('map');
        
        // Verify interrupt is registered
        if (!this.features.has('interrupt')) {
            console.warn('[SonarController] Core feature "interrupt" is missing!');
        }

        // Set up specific callback for map selection confirmed
        if (this.map) {
            this.map.on('selectionConfirmed', (data) => this.handleMapSelection(data));
        }
    }

    onGameStateUpdate(state) {
        if (!state) return;

        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        if (!sub) return;

        // Future update: handle tracking visualizations and teletype messages
    }

    // --- Feature Routing ---

    centerMap() {
        this.map?.execute('CENTER');
    }

    handleMapSelection(data) {
        console.log(`[SonarController] Map Selection:`, data);
        // Implement overlay highlighting / panning logic in the future
    }
}
