export default {
    name: 'Map: Pristine Layout Test',
    scene: 'mapTest',
    description: 'A static test scenario to verify the rendering and layout scalability of the map system.',
    initialState: {
        version: 1,
        phase: 'LIVE',
        submarines: [
            {
                id: 'A',
                name: 'Sub A',
                co: 'player_eng', // Match Director default playerId for now
                xo: null,
                sonar: null,
                eng: null,
                row: 7,
                col: 7,
                health: 4,
                submarineState: 'SUBMERGED',
                past_track: [],
                mines: []
            }
        ],
        board: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0],
            [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ]
    },
    suggestedEvents: [
        { label: 'Intent: NAVIGATE', event: 'SET_INTENT', data: { intent: 'NAVIGATE' } },
        { label: 'Intent: TORPEDO', event: 'SET_INTENT', data: { intent: 'TORPEDO' } },
        { label: 'Intent: MINE_LAY', event: 'SET_INTENT', data: { intent: 'MINE_LAY' } },
        { label: 'Intent: ROW_SELECT', event: 'SET_INTENT', data: { intent: 'ROW_SELECT' } },
        { label: 'Intent: SECTOR_SELECT', event: 'SET_INTENT', data: { intent: 'SECTOR_SELECT' } },
        { label: 'Center Ownship', event: 'CENTER_ON_OWNSHIP', data: {} }
    ],
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

            // Listen for high-level map events
            viewBox.on('map:clicked', (data) => {
                log(`[MAP CLICK] Row: ${data.row}, Col: ${data.col}`);
            });

            viewBox.on('map:zoomRequested', (data) => {
                const zDir = data.direction > 0 ? 'IN' : 'OUT';
                log(`[MAP ZOOM] ${zDir}`);
            });

            log('✅ Map Event Logging: ACTIVE');
        }, 500);
    }
};
