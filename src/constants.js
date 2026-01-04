export const InterruptTypes = {
    // In-game interrupts (auto-resume via InterruptTimers)
    TORPEDO_RESOLUTION: 'TORPEDO_RESOLUTION',
    SONAR_PING: 'SONAR_PING',
    SCENARIO_ACTION: 'SCENARIO_ACTION',
    START_POSITIONS: 'START_POSITIONS', // Triggered at game start

    // Out-of-game interrupts (require all-player ready-up)
    PAUSE: 'PAUSE',
    PLAYER_DISCONNECT: 'PLAYER_DISCONNECT'
};

export const GlobalPhases = {
    LOBBY: 'LOBBY',
    GAME_BEGINNING: 'GAME_BEGINNING',
    INTERRUPT: 'INTERRUPT',
    LIVE: 'LIVE',
    GAME_OVER: 'GAME_OVER'
};

export const SubmarineStates = {
    SUBMERGED: 'SUBMERGED',
    SURFACING: 'SURFACING',
    SURFACED: 'SURFACED',
    POST_MOVEMENT: 'POST_MOVEMENT',
    DESTROYED: 'DESTROYED'
};
