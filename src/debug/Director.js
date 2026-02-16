/**
 * Director — Mock server for Director Mode.
 * Simulates server events for testing via scenarios and manual injection.
 */

import { EventEmitter } from 'pixi.js';

export class Director extends EventEmitter {
    constructor() {
        super();
        this.scenarios = {};
        this.currentScenario = null;
        this.timeline = [];
        this.timelineIndex = 0;
        this.isPaused = false;
        this.timerId = null;
        this.lastEmittedEvent = null;
        this.lastState = null;
    }

    /**
     * Register scenarios from the SCENARIO_REGISTRY.
     * @param {object} registry - { key: scenarioConfig }
     */
    registerScenarios(registry) {
        this.scenarios = { ...this.scenarios, ...registry };
    }

    /**
     * Load a scenario by key or object.
     * @param {string|object} keyOrScenario - Scenario registry key or scenario configuration object
     */
    loadScenario(keyOrScenario) {
        const scenario = (typeof keyOrScenario === 'string')
            ? this.scenarios[keyOrScenario]
            : keyOrScenario;

        if (!scenario) {
            console.warn(`[Director] Scenario not found: ${keyOrScenario}`);
            return;
        }

        this.currentScenario = scenario;
        this.timeline = scenario.timeline || [];
        this.timelineIndex = 0;
        this.isPaused = false;

        console.log(`[Director] Loaded scenario: ${scenario.name || keyOrScenario} (${this.timeline.length} events)`);

        // Emit initial state if scenario provides one
        if (scenario.initialState) {
            this.lastState = scenario.initialState;
            this.emit('state', scenario.initialState);
        }
    }

    /**
     * Start executing the timeline.
     */
    play() {
        if (!this.timeline.length) return;
        this.isPaused = false;
        this._executeNext();
    }

    /**
     * Pause timeline execution.
     */
    pause() {
        this.isPaused = true;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * Resume from pause.
     */
    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this._executeNext();
    }

    /**
     * Step forward one event in the timeline.
     */
    step() {
        if (this.timelineIndex >= this.timeline.length) return;
        const event = this.timeline[this.timelineIndex++];
        this._emitEvent(event);
    }

    /**
     * Reset timeline to beginning.
     */
    reset() {
        this.timelineIndex = 0;
        this.isPaused = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        if (this.currentScenario?.initialState) {
            this.emit('state', this.currentScenario.initialState);
        }
    }

    /**
     * Inject an arbitrary event.
     * @param {string} eventName
     * @param {*} data
     */
    injectEvent(eventName, data) {
        console.log(`[Director] Injecting: ${eventName}`, data);
        if (eventName === 'state' || eventName === 'GAME_STATE') {
            this.lastState = data;
        }
        this.emit(eventName, data);
    }

    /**
     * Pause timeline execution.
     */
    pauseTimeline() {
        this.pause();
    }

    /**
     * Resume timeline execution.
     */
    resumeTimeline() {
        this.resume();
    }

    /**
     * Get the most recently emitted event for the UI debugger.
     */
    getLastEmittedEvent() {
        return this.lastEmittedEvent;
    }

    // ─────────── Private ───────────

    _executeNext() {
        if (this.isPaused || this.timelineIndex >= this.timeline.length) return;

        const event = this.timeline[this.timelineIndex++];
        const delay = event.delay || 0;

        this.timerId = setTimeout(() => {
            this._emitEvent(event);
            this._executeNext();
        }, delay);
    }

    _emitEvent(event) {
        const { type, data } = event;
        console.log(`[Director] Emitting: ${type}`, data);

        if (type === 'state' || type === 'GAME_STATE') {
            this.lastState = data;
        }

        this.lastEmittedEvent = { event: type, data };
        this.emit(type, data);
    }

    destroy() {
        if (this.timerId) {
            clearTimeout(this.timerId);
        }
        this.removeAllListeners();
    }
}
