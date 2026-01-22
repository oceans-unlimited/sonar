/**
 * Pure rules for surfacing logic.
 */
export const SurfacingRules = {
    /**
     * Resets the movement tracks/path for a submarine.
     * @param {Array} track 
     * @returns {Array}
     */
    resetTrack(track) {
        return [];
    },

    /**
     * Checks for ice and returns damage amount if applicable.
     * @param {object} cell 
     * @returns {number}
     */
    getIceDamage(cell) {
        // Mock ice check: if cell has 'ice' property, return damage
        return cell.isIce ? 1 : 0;
    },

    /**
     * Gets the sector name for a given position.
     * @param {number} row 
     * @param {number} col 
     * @returns {number}
     */
    getSector(row, col) {
        const sectorRow = Math.floor(row / 5);
        const sectorCol = Math.floor(col / 5);
        return sectorRow * 3 + sectorCol + 1;
    }
};
