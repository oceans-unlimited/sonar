export const SYSTEM_COLORS = {
    VESSEL: 0x3498db,   // blue
    WEAPONS: 0xe74c3c,  // red
    DETECTION: 0x2ecc71, // green
    REACTOR: 0xf1c40f,   // yellow
    EMPTY: 0xcccccc      // grey
};

export const SYSTEM_ASSETS = {
    'vessel': { asset: 'vessel', color: SYSTEM_COLORS.VESSEL },
    'weapons': { asset: 'weapons', color: SYSTEM_COLORS.WEAPONS },
    'detection': { asset: 'detection', color: SYSTEM_COLORS.DETECTION },
    'reactor': { asset: 'reactor', color: SYSTEM_COLORS.REACTOR },
    'empty': { asset: null, color: SYSTEM_COLORS.EMPTY }
};
