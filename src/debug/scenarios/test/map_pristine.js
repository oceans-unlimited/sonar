export default {
    name: 'Map: Pristine Layout Test',
    scene: 'mapTest',
    description: 'A static test scenario to verify the rendering and layout scalability of the map system.',
    timeline: [
        { type: 'server_event', event: 'SYS_STATUS', data: { status: 'online' }, delay: 100 }
    ],
    /**
     * Dynamic scenario logic to hook into interactive events.
     * @param {import('../../Director').Director} director 
     */
    run: (director) => {
        const app = globalThis.__PIXI_APP__;
        if (!app) return;

        const log = (msg) => {
            // 1. Log to the HTML #debug-log overlay
            if (window.logEvent) window.logEvent(msg);

            // 2. Log to the Director Panel's event log
            window.dispatchEvent(new CustomEvent('director:ui_trigger', {
                detail: { action: 'LOG', message: msg }
            }));
        };

        // Delay to ensure the scene is mounted and components are ready
        setTimeout(() => {
            const scene = app.stage.children.find(c => c.label === 'mapTestScene');
            if (!scene || !scene.mapView) {
                console.warn('[Scenario] map_pristine: mapTestScene/mapView not found.');
                return;
            }

            const mv = scene.mapView;
            const viewBox = mv.viewBox;
            const grid = mv.mapGrid.container;

            // Listen for high-level map events
            viewBox.on('map:clicked', (data) => {
                log(`[MAP CLICK] Row: ${data.row}, Col: ${data.col}`);
            });

            viewBox.on('map:zoomRequested', (data) => {
                const zDir = data.direction > 0 ? 'IN' : 'OUT';
                log(`[MAP ZOOM] ${zDir}`);
            });

            // Listen for raw pointer events on the grid
            if (grid) {
                grid.on('pointerdown', (e) => {
                    const local = grid.toLocal(e.global);
                    log(`[POINTER DOWN] x: ${Math.round(local.x)}, y: ${Math.round(local.y)}`);
                });
                grid.on('pointerup', () => {
                    log(`[POINTER UP]`);
                });
            }

            log('✅ Map Event Logging: ACTIVE');
        }, 500);
    }
};
