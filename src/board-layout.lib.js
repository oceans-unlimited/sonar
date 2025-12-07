export const L = 1;
export const W = 0;

export function generateBoard() {
    // For now, just generate the default board. Will randomly generate a board later.
    return [[W, W, W, W, W,   W, W, W, W, W,   W, W, W, W, W,],
            [W, W, L, W, W,   W, L, W, W, W,   W, W, L, L, W,],
            [W, W, L, W, W,   W, W, W, L, W,   W, W, L, W, W,],
            [W, W, W, W, W,   W, W, W, L, W,   W, W, W, W, W,],
            [W, W, W, W, W,   W, W, W, W, W,   W, W, W, W, W,],
            
            [W, W, W, W, W,   W, W, W, W, W,   W, W, W, W, W,],
            [W, L, W, L, W,   W, L, W, L, W,   W, W, W, W, W,],
            [W, L, W, L, W,   W, L, W, W, W,   W, W, W, W, W,],
            [W, W, W, L, W,   W, W, L, W, W,   W, L, L, L, W,],
            [W, W, W, W, W,   W, W, W, W, W,   W, W, W, W, W,],
            
            [W, W, W, L, W,   W, W, W, W, W,   W, W, W, W, W,],
            [W, W, L, W, W,   W, W, L, W, W,   W, L, W, W, W,],
            [L, W, W, W, W,   W, W, W, W, W,   W, W, L, W, W,],
            [W, W, L, W, W,   W, L, W, L, W,   W, W, W, L, W,],
            [W, W, W, L, W,   W, W, W, W, W,   W, W, W, W, W,],];
}