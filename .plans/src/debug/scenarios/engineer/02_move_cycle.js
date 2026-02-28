import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
    name: 'Engineer - Interactive Move Loop',
    description: 'Fully interactive loop: Captain Moves -> User Cross-off -> Submerge -> Repeat until board clear.',
    scene: 'engineer',

    // Initial State
    initialState: createMockSubmarineState({
        submarineState: SUBMARINE_STATES.SUBMERGED
    }),

    /**
     * Dynamic scenario logic
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const hLog = (msg) => director.triggerEvent(null, null, 0); // Hack to access log if needed, or better:
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        log('🚀 Starting Interactive Move Loop...');
        await delay(1000);

        // 1. Setup State Tracking
        // We'll maintain a local copy of the layout to track what's crossed out
        let currentLayout = createMockSubmarineState().engineLayout;
        let crossedOutSlots = [];

        // Helper to get available directions
        const getAvailableDirections = () => {
            const dirs = ['N', 'E', 'S', 'W'];
            return dirs.filter(d => {
                const dirData = currentLayout.directions[d];
                // Check if any slot in this direction is NOT crossed out
                const allSlots = [
                    ...Object.keys(dirData.frameSlots),
                    ...Object.keys(dirData.reactorSlots)
                ];
                
                // If any slot is missing from crossedOutSlots, direction is valid
                return allSlots.some(slotId => 
                    !crossedOutSlots.find(xo => xo.direction === d && xo.slotId === slotId)
                );
            });
        };

        // 2. The Game Loop
        while (director.isRunning) {
            const validDirs = getAvailableDirections();
            
            if (validDirs.length === 0) {
                log('🎉 All Systems Disabled! Simulation Complete.');
                break;
            }

            // A. Pick Random Direction
            const direction = validDirs[Math.floor(Math.random() * validDirs.length)];
            log(`📢 Captain Orders: "Helm, ${getDirName(direction)}!"`);
            await delay(1500);

            // B. Server: Move Sub
            log(`⚠️ STATE: MOVED (${direction}). Waiting for Engineer...`);
            director.emit('GAME_STATE', createMockSubmarineState({
                submarineState: SUBMARINE_STATES.MOVED,
                submarineStateData: {
                    MOVED: { 
                        directionMoved: direction, 
                        engineerCrossedOutSystem: false,
                        xoChargedGauge: false
                    }
                },
                engineLayout: { crossedOutSlots: [...crossedOutSlots] }
            }));

            // C. Wait for User Input
            const userAction = await new Promise((resolve) => {
                const handler = (data) => {
                    // removing listener to avoid dupes in next loop is tricky without reference
                    // For now, Director.off isn't super granular but we can use `once` logic if implemented
                    // or just manually remove.
                    director.off('cross_off_system', handler);
                    resolve(data);
                };
                director.on('cross_off_system', handler);
            });

            log(`✅ User Action: ${userAction.direction} ${userAction.slotId}`);

            // D. Validate & Update State
            if (userAction.direction !== direction) {
                log('❌ WRONG DIRECTION! (Simulation ignores this, but FYI)');
            }

            crossedOutSlots.push({ direction: userAction.direction, slotId: userAction.slotId });
            
            // E. Server: Confirm Cross-off
            director.emit('GAME_STATE', createMockSubmarineState({
                submarineState: SUBMARINE_STATES.MOVED,
                submarineStateData: {
                    MOVED: { 
                        directionMoved: direction, 
                        engineerCrossedOutSystem: true,
                        xoChargedGauge: false
                    }
                },
                engineLayout: { crossedOutSlots: [...crossedOutSlots] }
            }));

            await delay(1500);

            // F. Server: Submerge
            log('🌊 Diving... Cycle Complete.');
            director.emit('GAME_STATE', createMockSubmarineState({
                submarineState: SUBMARINE_STATES.SUBMERGED,
                engineLayout: { crossedOutSlots: [...crossedOutSlots] }
            }));

            await delay(2000);
        }
    }
};

function getDirName(d) {
    return { 'N': 'North', 'E': 'East', 'S': 'South', 'W': 'West' }[d];
}
