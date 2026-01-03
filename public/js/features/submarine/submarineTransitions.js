import { SubmarineStates } from './submarineStates.js';

/**
 * Defines legal state transitions for a submarine.
 */
export const SubmarineTransitions = {
    [SubmarineStates.SUBMERGED]: [SubmarineStates.SURFACING, SubmarineStates.DESTROYED],
    [SubmarineStates.SURFACING]: [SubmarineStates.SURFACED, SubmarineStates.DESTROYED],
    [SubmarineStates.SURFACED]: [SubmarineStates.SUBMERGED, SubmarineStates.DESTROYED],
    [SubmarineStates.DESTROYED]: [] // Terminal state
};
