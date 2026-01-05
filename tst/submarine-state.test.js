import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submarineFacade } from '../public/js/features/submarine/SubmarineFacade.js';
import { SubmarineStateMachine } from '../public/js/features/submarine/submarineStateMachine.js';
import { SubmarineStates } from '../public/js/features/submarine/submarineStates.js';
import { SubmarineEvents } from '../public/js/features/submarine/submarineEvents.js';
import { SurfacingRules } from '../public/js/features/submarine/surfacingRules.js';
import { SurfacingController, surfacingController } from '../public/js/features/submarine/surfacingController.js';

describe('SubmarineStateMachine', {skip: true}, () => {
    let sub;

    beforeEach(() => {
        sub = new SubmarineStateMachine('A');
    });

    it('should start in SUBMERGED state', () => {
        expect(sub.getState()).toBe(SubmarineStates.SUBMERGED);
        expect(sub.canMove()).toBe(true);
        expect(sub.canFire()).toBe(true);
    });

    it('should transition through valid lifecycle', () => {
        const listener = vi.fn();
        sub.subscribe(listener);

        sub.transitionTo(SubmarineStates.SURFACING);
        expect(sub.getState()).toBe(SubmarineStates.SURFACING);
        expect(sub.canMove()).toBe(false);
        expect(listener).toHaveBeenCalledWith(SubmarineEvents.SUB_STATE_CHANGED, expect.objectContaining({
            state: SubmarineStates.SURFACING,
            oldState: SubmarineStates.SUBMERGED
        }));

        sub.transitionTo(SubmarineStates.SURFACED);
        expect(sub.getState()).toBe(SubmarineStates.SURFACED);

        sub.transitionTo(SubmarineStates.SUBMERGED);
        expect(sub.getState()).toBe(SubmarineStates.SUBMERGED);
    });

    it('should block invalid transitions', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Cannot jump from SUBMERGED to SURFACED directly
        sub.transitionTo(SubmarineStates.SURFACED);
        expect(sub.getState()).toBe(SubmarineStates.SUBMERGED);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should allow DESTROYED from any state', () => {
        sub.transitionTo(SubmarineStates.DESTROYED);
        expect(sub.getState()).toBe(SubmarineStates.DESTROYED);
        expect(sub.isDestroyed()).toBe(true);
    });
});

describe('SurfacingRules', {skip: true}, () => {
    it('should calculate sectors correctly', () => {
        expect(SurfacingRules.getSector(0, 0)).toBe(1);
        expect(SurfacingRules.getSector(4, 4)).toBe(1);
        expect(SurfacingRules.getSector(0, 5)).toBe(2);
        expect(SurfacingRules.getSector(5, 0)).toBe(4);
        expect(SurfacingRules.getSector(14, 14)).toBe(9);
    });

    it('should reset tracks', () => {
        const track = [{ r: 1, c: 1 }, { r: 1, c: 2 }];
        expect(SurfacingRules.resetTrack(track)).toEqual([]);
    });

    it('should detect ice damage', () => {
        expect(SurfacingRules.getIceDamage({ isIce: true })).toBe(1);
        expect(SurfacingRules.getIceDamage({ isIce: false })).toBe(0);
    });
});

describe('SurfacingController', {skip: true}, () => {
    beforeEach(() => {
        submarineFacade.init(['A']);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should orchestrate full surfacing flow', () => {
        const sub = submarineFacade.getSub('A');

        surfacingController.requestSurface('A', { row: 2, col: 2 });
        expect(sub.getState()).toBe(SubmarineStates.SURFACING);

        vi.advanceTimersByTime(1000);
        expect(sub.getState()).toBe(SubmarineStates.SURFACED);

        surfacingController.requestSubmerge('A');
        expect(sub.getState()).toBe(SubmarineStates.SUBMERGED);
    });
});
