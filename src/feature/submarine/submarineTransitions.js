/**
 * Canonical legal state transitions for a submarine.
 * Used by SubmarineState.js to validate logic changes.
 */
export const SubmarineTransitions = {
    // Standard turn loop
    'SUBMERGED': ['MOVED', 'SURFACING', 'DESTROYED'],
    
    // Mid-turn (Waiting for ENG/XO)
    'MOVED': ['SUBMERGED', 'SURFACING', 'DESTROYED'],
    
    // Emergency / Maintenance
    'SURFACING': ['SURFACED', 'DESTROYED'],
    'SURFACED': ['SUBMERGED', 'DESTROYED'],
    
    // Terminal
    'DESTROYED': []
};
