import { describe, it, expect, vi, beforeEach } from 'vitest';
import { interruptManager } from '../public/js/features/interrupts/InterruptManager.js';
import { interruptController } from '../public/js/features/interrupts/InterruptController.js';
import { interruptTimers } from '../public/js/features/interrupts/InterruptTimers.js';
import { simulationClock } from '../public/js/core/clock/simulationClock.js';
import { gamePhaseManager, GamePhases } from '../public/js/core/clock/gamePhaseManager.js';
import { InterruptTypes } from '../public/js/features/interrupts/InterruptTypes.js';

describe('Interrupt System', () => {
    beforeEach(() => {
        // Reset singleton states if possible or ensure clean start
        // Since they are singletons, we might need to manually reset some fields if necessary
        // For these tests, we'll assume they behave predictably if we resolve everything
        if (interruptManager.getActiveInterrupt()) {
            interruptManager.resolveInterrupt(interruptManager.getActiveInterrupt().type);
        }
        simulationClock.start();
        gamePhaseManager.setPhase(GamePhases.LIVE);
    });

    it('should stop the clock when an interrupt is requested', () => {
        expect(simulationClock.isRunning()).toBe(true);
        expect(gamePhaseManager.getPhase()).toBe(GamePhases.LIVE);

        interruptController.requestPause();

        expect(simulationClock.isRunning()).toBe(false);
        expect(gamePhaseManager.getPhase()).toBe(GamePhases.INTERRUPT);
        expect(interruptManager.getActiveInterrupt().type).toBe(InterruptTypes.PAUSE);
    });

    it('should restart the clock when an interrupt is resolved', () => {
        interruptController.requestPause();
        expect(simulationClock.isRunning()).toBe(false);

        interruptController.resolvePause();

        expect(simulationClock.isRunning()).toBe(true);
        expect(gamePhaseManager.getPhase()).toBe(GamePhases.LIVE);
        expect(interruptManager.getActiveInterrupt()).toBe(null);
    });

    it('should ignore new interrupts if one is already active', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        interruptController.requestPause();
        interruptController.requestTorpedoResolution({ target: 'sub1' });

        expect(interruptManager.getActiveInterrupt().type).toBe(InterruptTypes.PAUSE);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should auto-resolve timed interrupts via InterruptTimers', async () => {
        // We need to use fake timers for this
        vi.useFakeTimers();

        interruptController.requestTorpedoResolution();
        expect(simulationClock.isRunning()).toBe(false);

        // Advance time by the torpedo resolution duration (5000ms in InterruptTimers)
        vi.advanceTimersByTime(5000);

        expect(simulationClock.isRunning()).toBe(true);
        expect(interruptManager.getActiveInterrupt()).toBe(null);

        vi.useRealTimers();
    });
});
