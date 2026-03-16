import { createMockSubmarineState } from '../shared/engineMockData.js';

export default {
    name: 'Map: Selection Modes Test',
    scene: 'mapTest',
    description: 'Tests individual square highlights and full row/column selection (Sonar Ping simulation).',
    playerId: 'player_co',

    initialState: {
        version: 1,
        phase: 'LIVE',
        board: Array(15).fill(Array(15).fill(0)),
        submarines: [
            createMockSubmarineState({
                row: 7,
                col: 7
            })
        ]
    },

    timeline: [
        // 1. Initial Individual Square Selection (Direct Socket terminology)
        {
            type: 'server_event',
            event: 'CLEAR_OVERLAYS',
            data: {},
            delay: 1000
        },
        {
            type: 'server_event',
            event: 'SONAR_PING',
            data: { row: 2, col: 2, axis: 'row', color: 0x00FFFF, alpha: 0.3 },
            delay: 2000
        },

        // 2. Select a Column
        {
            type: 'server_event',
            event: 'SONAR_PING',
            data: { col: 10, axis: 'col', color: 0xFFFF00, alpha: 0.4 },
            delay: 4000
        },

        // 3. Clear and select another Row
        {
            type: 'server_event',
            event: 'CLEAR_OVERLAYS',
            data: {},
            delay: 6000
        },
        {
            type: 'server_event',
            event: 'SONAR_PING',
            data: { row: 5, axis: 'row', color: 0xFF00FF, alpha: 0.5 },
            delay: 7000
        },

        // 4. Test automated state-driven highlight (simulate server response)
        {
            type: 'state',
            data: {
                version: 2,
                phase: 'INTERRUPT',
                board: Array(15).fill(Array(15).fill(0)),
                activeInterrupt: {
                    type: 'SONAR_PING',
                    payload: { response: { row: 8, axis: 'row' } }
                },
                submarines: [
                    createMockSubmarineState({
                        row: 7,
                        col: 7
                    })
                ]
            },
            delay: 9000
        },

        // 5. Clear again
        {
            type: 'server_event',
            event: 'CLEAR_OVERLAYS',
            data: {},
            delay: 11000
        }
    ],

    /**
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

        setTimeout(() => {
            const scene = app.stage.children.find(c => c.label === 'mapTestScene');
            if (!scene || !scene.mapView) return;

            const mv = scene.mapView;
            const viewBox = mv.viewBox;

            // Log interactions
            viewBox.on('map:clicked', (data) => {
                log(`[INTERACT] Manual Click: ${data.row}, ${data.col}`);
            });

            // Simulate manual clicks at specific times to test interaction alongside automation
            setTimeout(() => {
                log('[TEST] Simulating manual click at 8,8');
                viewBox.emit('map:clicked', { row: 8, col: 8 });
            }, 12000);

            setTimeout(() => {
                log('[TEST] Simulating manual click at 3,3');
                viewBox.emit('map:clicked', { row: 3, col: 3 });
            }, 14000);

            log('✅ Map Selection Test: ACTIVE (Agnostic Terminology)');
        }, 500);
    }
};
