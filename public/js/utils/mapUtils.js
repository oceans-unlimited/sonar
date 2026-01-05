
/**
 * mapUtils.js
 * Shared utility functions for map logic (grid, distance, sectors).
 */

export const MapUtils = {
    /**
     * Calculates the orthogonal (Manhattan) distance between two grid points.
     * @param {object} p1 - { row, col }
     * @param {object} p2 - { row, col }
     * @returns {number} The distance (sum of row difference and col difference).
     */
    getRange(p1, p2) {
        if (!p1 || !p2) return 0;
        return Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col);
    },

    /**
     * Determines the sector number (1-9) for a given grid coordinate.
     * Grid is 15x15. Sectors are 5x5 blocks.
     * @param {number} row - 0-indexed row
     * @param {number} col - 0-indexed col
     * @returns {number} Sector ID (1-9)
     */
    getSector(row, col) {
        // Validation
        if (row < 0 || col < 0) return 0;

        const sectorRow = Math.floor(row / 5);
        const sectorCol = Math.floor(col / 5);

        // Sector layout:
        // 1 2 3
        // 4 5 6
        // 7 8 9

        return (sectorRow * 3) + sectorCol + 1;
    },

    /**
     * Converts a grid coordinate to alphanumeric string (e.g., 0,0 -> A1)
     */
    toAlphaNumeric(row, col) {
        const h = String.fromCharCode(65 + col);
        const v = row + 1;
        return `${h}${v}`;
    }
};
