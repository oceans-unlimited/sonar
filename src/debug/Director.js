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
        this.lastState = null;
        this.isRunning = false;
        this.playerId = 'player_eng';
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

        // Canonical server behavior: assign player ID upon connection/load
        this.emit('player_id', this.playerId);

        this.reset(); // Clear any previous running state/timers
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

        // Execute dynamic run logic if provided
        if (typeof scenario.run === 'function') {
            scenario.run(this);
        }
    }

    /**
     * Start executing the timeline.
     */
    play() {
        if (!this.timeline.length) return;
        this.isRunning = true;
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
        this.isRunning = false;
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
        if (eventName === 'state') {
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
        if (this.isPaused) return;

        if (this.timelineIndex >= this.timeline.length) {
            this.isRunning = false;
            console.log(`[Director] Timeline complete.`);
            return;
        }

        const step = this.timeline[this.timelineIndex++];

        // Handle standalone delay steps in the timeline
        if (step.type === 'delay') {
            const ms = step.ms || step.delay || 0;
            this.timerId = setTimeout(() => {
                this._executeNext();
            }, ms);
            return;
        }

        // For other steps, handle custom 'delay' property (pause BEFORE event) if any
        const eventDelay = step.delay || 0;

        this.timerId = setTimeout(() => {
            this._emitEvent(step);
            this._executeNext();
        }, eventDelay);
    }

    _emitEvent(step) {
        const { type, data } = step;

        if (type === 'server_event') {
            const eventName = step.event;
            console.log(`[Director] Emitting server_event: ${eventName}`, data);

            if (eventName === 'state') {
                this.lastState = data;
            }

            this.lastEmittedEvent = { event: eventName, data };
            this.emit(eventName, data);
        } else if (type === 'ui_trigger') {
            console.log(`[Director] UI Trigger:`, step);
            // Re-emit on window for DebugOverlay and other UI components
            window.dispatchEvent(new CustomEvent('director:ui_trigger', {
                detail: step
            }));
        } else {
            // Support direct events (e.g. { type: 'state', data: ... })
            const eventName = type || step.event;
            if (!eventName) return;

            console.log(`[Director] Emitting: ${eventName}`, data);

            if (eventName === 'state') {
                this.lastState = data;
            }

            this.lastEmittedEvent = { event: eventName, data };
            this.emit(eventName, data);
        }
    }

    destroy() {
        if (this.timerId) {
            clearTimeout(this.timerId);
        }
        this.removeAllListeners();
    }
}
