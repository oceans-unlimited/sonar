import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimulationClock } from '../public/js/core/clock/simulationClock.js';
import { GamePhaseManager, GamePhases } from '../public/js/core/clock/gamePhaseManager.js';
import { ClockEvents } from '../public/js/core/clock/clockEvents.js';

describe('SimulationClock', () => {
    let clock;

    beforeEach(() => {
        clock = new SimulationClock();
    });

    it('should start stopped', () => {
        expect(clock.isRunning()).toBe(false);
    });

    it('should start and stop correctly', () => {
        clock.start();
        expect(clock.isRunning()).toBe(true);
        clock.stop();
        expect(clock.isRunning()).toBe(false);
    });

    it('should emit events on start/stop', () => {
        const listener = vi.fn();
        clock.subscribe(listener);

        clock.start();
        expect(listener).toHaveBeenCalledWith(ClockEvents.CLOCK_START, null);

        clock.stop();
        expect(listener).toHaveBeenCalledWith(ClockEvents.CLOCK_STOP, null);
    });

    it('should not emit if already in state', () => {
        const listener = vi.fn();
        clock.subscribe(listener);

        clock.start();
        clock.start();
        expect(listener).toHaveBeenCalledTimes(1);

        clock.stop();
        clock.stop();
        expect(listener).toHaveBeenCalledTimes(2);
    });
});

describe('GamePhaseManager', () => {
    let phaseManager;

    beforeEach(() => {
        phaseManager = new GamePhaseManager();
    });

    it('should start in LOBBY phase', () => {
        expect(phaseManager.getPhase()).toBe(GamePhases.LOBBY);
    });

    it('should transition from LOBBY to LIVE', () => {
        const listener = vi.fn();
        phaseManager.subscribe(listener);

        phaseManager.setPhase(GamePhases.LIVE);
        expect(phaseManager.getPhase()).toBe(GamePhases.LIVE);
        expect(listener).toHaveBeenCalledWith(ClockEvents.PHASE_CHANGE, {
            phase: GamePhases.LIVE,
            oldPhase: GamePhases.LOBBY
        });
    });

    it('should not transition from LOBBY to GAME_OVER (invalid)', () => {
        const listener = vi.fn();
        phaseManager.subscribe(listener);
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        phaseManager.setPhase(GamePhases.GAME_OVER);
        expect(phaseManager.getPhase()).toBe(GamePhases.LOBBY);
        expect(listener).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should follow complex transitions', () => {
        phaseManager.setPhase(GamePhases.LIVE);
        expect(phaseManager.getPhase()).toBe(GamePhases.LIVE);

        phaseManager.setPhase(GamePhases.INTERRUPT);
        expect(phaseManager.getPhase()).toBe(GamePhases.INTERRUPT);

        phaseManager.setPhase(GamePhases.LIVE);
        expect(phaseManager.getPhase()).toBe(GamePhases.LIVE);

        phaseManager.setPhase(GamePhases.GAME_OVER);
        expect(phaseManager.getPhase()).toBe(GamePhases.GAME_OVER);

        phaseManager.setPhase(GamePhases.LOBBY);
        expect(phaseManager.getPhase()).toBe(GamePhases.LOBBY);
    });
});
