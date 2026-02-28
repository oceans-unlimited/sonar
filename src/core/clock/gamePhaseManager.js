import { ClockEvents } from './clockEvents.js';

/**
 * Valid phases for the game.
 */
export const GamePhases = {
    LOBBY: 'LOBBY',
    GAME_BEGINNING: 'GAME_BEGINNING',
    LIVE: 'LIVE',
    INTERRUPT: 'INTERRUPT',
    GAME_OVER: 'GAME_OVER'
};

/**
 * Owns the current game phase and validates transitions.
 */
export class GamePhaseManager {
    constructor() {
        this._phase = GamePhases.LOBBY;
        this._listeners = new Set();

        // Define legal transitions
        this._transitions = {
            [GamePhases.LOBBY]: [GamePhases.GAME_BEGINNING, GamePhases.INTERRUPT, GamePhases.LIVE],
            [GamePhases.GAME_BEGINNING]: [GamePhases.INTERRUPT, GamePhases.LIVE],
            [GamePhases.LIVE]: [GamePhases.INTERRUPT, GamePhases.GAME_OVER, GamePhases.LOBBY],
            [GamePhases.INTERRUPT]: [GamePhases.LIVE, GamePhases.GAME_OVER],
            [GamePhases.GAME_OVER]: [GamePhases.LOBBY]
        };
    }

    /**
     * Sets the current game phase if the transition is legal.
     * @param {string} newPhase 
     */
    setPhase(newPhase) {
        if (this._phase === newPhase) return;

        if (this._isValidTransition(this._phase, newPhase)) {
            const oldPhase = this._phase;
            this._phase = newPhase;
            this._emit(ClockEvents.PHASE_CHANGE, { phase: newPhase, oldPhase });
        } else {
            console.warn(`Invalid phase transition: ${this._phase} -> ${newPhase}`);
        }
    }

    /**
     * Returns the current game phase.
     * @returns {string}
     */
    getPhase() {
        return this._phase;
    }

    /**
     * Subscribes a listener to phase changes.
     * @param {Function} callback 
     */
    subscribe(callback) {
        this._listeners.add(callback);
    }

    /**
     * Unsubscribes a listener from phase changes.
     * @param {Function} callback 
     */
    unsubscribe(callback) {
        this._listeners.delete(callback);
    }

    _isValidTransition(from, to) {
        return this._transitions[from] && this._transitions[from].includes(to);
    }

    _emit(event, payload) {
        this._listeners.forEach(callback => callback(event, payload));
    }
}

export const gamePhaseManager = new GamePhaseManager();