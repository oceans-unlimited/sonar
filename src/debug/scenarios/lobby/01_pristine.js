/**
 * Lobby - Pristine Scenario
 */
import { PLAYER_ROLES } from '../shared/engineMockData.js';

export default {
    name: "Lobby - Pristine",
    scene: 'lobby',
    playerId: PLAYER_ROLES.CO,
    initialState: {
        phase: 'LOBBY',
        players: [
            { id: PLAYER_ROLES.CO, name: 'ALFA-CO', connectionOrder: 1 },
            { id: PLAYER_ROLES.XO, name: 'ALFA-XO', connectionOrder: 2 },
            { id: PLAYER_ROLES.ENG, name: 'ALFA-ENG', connectionOrder: 3 },
            { id: PLAYER_ROLES.SONAR, name: 'ALFA-SONAR', connectionOrder: 4 },
            { id: 'player_5', name: 'BRAVO-CO', connectionOrder: 5 },
            { id: 'player_6', name: 'BRAVO-XO', connectionOrder: 6 },
            { id: 'player_7', name: 'UNASSIGNED-1', connectionOrder: 7 },
            { id: 'player_8', name: 'UNASSIGNED-2', connectionOrder: 8 }
        ],
        submarines: [
            {
                id: 'A',
                name: 'USS ENTERPRISE',
                co: PLAYER_ROLES.CO,
                xo: PLAYER_ROLES.XO,
                eng: PLAYER_ROLES.ENG,
                sonar: PLAYER_ROLES.SONAR
            },
            {
                id: 'B',
                name: 'RED OCTOBER',
                co: 'player_5',
                xo: 'player_6',
                eng: null,
                sonar: null
            }
        ],
        ready: [PLAYER_ROLES.CO, PLAYER_ROLES.XO]
    },
    run: async (director) => {
        const log = (msg) => window.dispatchEvent(new CustomEvent('director:ui_trigger', { detail: { action: 'log', message: msg } }));
        log('🚀 Lobby Pristine Test Started');
    },
    timeline: []
};
