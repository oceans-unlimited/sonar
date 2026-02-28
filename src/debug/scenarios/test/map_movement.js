import { createMockSubmarineState } from '../shared/engineMockData.js';

export default {
    name: 'Map: Basic Movement Test',
    scene: 'mapTest',
    description: 'Automates a sequence of movement events to verify tracking and pathing logic.',

    // Initial State: Start at A1 (0,0)
    initialState: createMockSubmarineState({
        row: 0,
        col: 0
    }),

    timeline: [
        { type: 'state', data: createMockSubmarineState({ row: 0, col: 0 }), delay: 1000 },
        { type: 'state', data: createMockSubmarineState({ row: 0, col: 1 }), delay: 2500 },
        { type: 'state', data: createMockSubmarineState({ row: 1, col: 1 }), delay: 4000 },
        { type: 'state', data: createMockSubmarineState({ row: 1, col: 2 }), delay: 5500 },
        { type: 'state', data: createMockSubmarineState({ row: 2, col: 2 }), delay: 7000 },
    ],
    /**
     * Dynamic scenario logic to hook into interactive events and movement updates.
     * @param {import('../../Director').Director} director 
     */
    run: (director) => {
        const app = globalThis.__PIXI_APP__;
        if (!app) return;

        const log = (msg) => {
            if (window.logEvent) window.logEvent(msg);
            window.dispatchEvent(new CustomEvent('director:ui_trigger', {
                detail: { action: 'LOG', message: msg }
            }));
        };

        // Delay to ensure the scene is mounted
        setTimeout(() => {
            const scene = app.stage.children.find(c => c.label === 'mapTestScene');
            if (!scene || !scene.mapView) {
                console.warn('[Scenario] map_movement: mapTestScene/mapView not found.');
                return;
            }

            const mv = scene.mapView;
            const viewBox = mv.viewBox;

            // Listen for map-specific interactions
            viewBox.on('map:clicked', (data) => {
                log(`[INTERACT] Map Click: ${data.row}, ${data.col}`);
            });

            // Listen for the movement events being emitted by this scenario
            director.on('SUB_MOVED', (data) => {
                log(`[MOVED] Sub at ${data.pos.row}, ${data.pos.col} (Dir: ${data.dir})`);

                // Optional: We could automatically pan the map to follow the sub
                // But for now, we just log it to verify the event chain works.
            });

            log('✅ Map Movement Test: ACTIVE');
        }, 500);
    }
};
