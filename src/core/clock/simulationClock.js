import { ClockEvents } from './clockEvents.js';

/**
 * Owns the RUNNING / FROZEN state of the simulation.
 * Controllers should query this before performing time-sensitive actions.
 */
export class SimulationClock {
    constructor() {
        this._running = false;
        this._listeners = new Set();
    }

    /**
     * Starts the simulation clock.
     */
    start() {
        if (!this._running) {
            this._running = true;
            this._emit(ClockEvents.CLOCK_START);
        }
    }

    /**
     * Stops the simulation clock.
     */
    stop() {
        if (this._running) {
            this._running = false;
            this._emit(ClockEvents.CLOCK_STOP);
        }
    }

    /**
     * Returns whether the simulation clock is currently running.
     * @returns {boolean}
     */
    isRunning() {
        return this._running;
    }

    /**
     * Subscribes a listener to clock events.
     * @param {Function} callback 
     */
    subscribe(callback) {
        this._listeners.add(callback);
    }

    /**
     * Unsubscribes a listener from clock events.
     * @param {Function} callback 
     */
    unsubscribe(callback) {
        this._listeners.delete(callback);
    }

    _emit(event, payload = null) {
        this._listeners.forEach(callback => callback(event, payload));
    }
}

export const simulationClock = new SimulationClock();
