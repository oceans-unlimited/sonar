import { createMockSubmarineState, SUBMARINE_STATES } from '../shared/engineMockData.js';

export default {
    name: 'XO - Interactive Move Loop',
    description: 'Fully interactive loop: Captain Moves -> User Charges -> Submerge -> Repeat.',
    playerId: 'player_xo',
    scene: 'xo',

    // Initial State
    initialState: {
        version: Date.now(),
        phase: 'LIVE',
        submarines: [createMockSubmarineState({
            submarineState: SUBMARINE_STATES.SUBMERGED
        })]
    },

    /**
     * Dynamic scenario logic
     * @param {import('../../Director').Director} director 
     */
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        log('🚀 Starting XO Interactive Move Loop...');
        await delay(1000);

        // 1. Setup State Tracking
        let actionGauges = { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: 0 };

        // 2. The Game Loop
        while (director.isRunning) {
            // A. Captain Moves
            const direction = ['N', 'E', 'S', 'W'][Math.floor(Math.random() * 4)];
            log(`📢 Captain Orders: "Helm, ${getDirName(direction)}!"`);
            await delay(1500);

            // B. Server: Move Sub
            log(`⚠️ STATE: MOVED (${direction}). Waiting for XO to charge...`);
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: true, // Auto-spoof engineer for this loop
                            xoChargedGauge: false
                        }
                    },
                    actionGauges: { ...actionGauges }
                })]
            });

            // C. Wait for User Input
            const userAction = await new Promise((resolve) => {
                const handler = (gauge) => {
                    director.off('charge_gauge', handler);
                    resolve(gauge);
                };
                director.on('charge_gauge', handler);
            });

            log(`✅ User Action: Charged ${userAction}`);
            
            // Increment local gauge count
            if (actionGauges[userAction] !== undefined) {
                const max = (userAction === 'silence') ? 5 : 3;
                actionGauges[userAction] = Math.min(max, actionGauges[userAction] + 1);
            }

            // E. Server: Confirm Charge
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.MOVED,
                    submarineStateData: {
                        MOVED: {
                            directionMoved: direction,
                            engineerCrossedOutSystem: true,
                            xoChargedGauge: true
                        }
                    },
                    actionGauges: { ...actionGauges }
                })]
            });

            await delay(1500);

            // F. Server: Submerge
            log('🌊 Diving... Cycle Complete.');
            director.emit('state', {
                version: Date.now(),
                phase: 'LIVE',
                submarines: [createMockSubmarineState({
                    submarineState: SUBMARINE_STATES.SUBMERGED,
                    actionGauges: { ...actionGauges }
                })]
            });

            await delay(2000);
        }
    }
};

function getDirName(d) {
    return { 'N': 'North', 'E': 'East', 'S': 'South', 'W': 'West' }[d];
}
