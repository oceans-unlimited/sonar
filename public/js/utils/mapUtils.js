
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
    },

    /**
     * Gets comprehensive data about a square for intent menu decisions
     * @param {object} coords - { row, col }
     * @param {object} ownship - Current submarine position { row, col, pastTrack, mines }
     * @param {object} terrain - 2D array of terrain data
     * @param {object} waypoints - Current waypoints { current: {row, col}, ... }
     * @param {object} targets - Current targets { torpedo: {row, col}, ... }
     * @returns {object} Square data for menu logic
     */
    getSquareData(coords, ownship, terrain, waypoints = {}, targets = {}) {
        const { row, col } = coords;
        const sector = this.getSector(row, col);

        // Check if coordinates are valid
        const isValidCoords = row >= 0 && row < 15 && col >= 0 && col < 15;

        let terrainType = 'UNKNOWN';
        if (isValidCoords && terrain && terrain[row] && terrain[row][col]) {
            terrainType = terrain[row][col].type || 'WATER'; // Default to water if not specified
        }

        // Check various conditions
        const isOwnMine = ownship?.mines?.some(mine => mine.row === row && mine.col === col) || false;
        const isInPastTrack = ownship?.pastTrack?.some(track => track.r === row && track.c === col) || false;
        const isCurrentWaypoint = waypoints?.current?.row === row && waypoints?.current?.col === col;
        const isCurrentTarget = targets?.torpedo?.row === row && targets?.torpedo?.col === col;

        return {
            coords: { row, col },
            sector,
            terrain: terrainType,
            isValidCoords,
            isOwnMine,
            isInPastTrack,
            isCurrentWaypoint,
            isCurrentTarget,
            // Additional computed data
            alphaNumeric: this.toAlphaNumeric(row, col),
            range: ownship ? this.getRange(ownship, coords) : 0
        };
    },

    /**
     * Checks if a square is navigable (not land)
     * @param {object} squareData - Result from getSquareData
     * @returns {boolean}
     */
    isNavigable(squareData) {
        return squareData.terrain === 'WATER';
    },

    /**
     * Checks if waypoint can be set at this square
     * @param {object} squareData - Result from getSquareData
     * @returns {boolean}
     */
    canSetWaypoint(squareData) {
        return squareData.isValidCoords && this.isNavigable(squareData) && !squareData.isOwnMine;
    },

    /**
     * Converts screen coordinates to grid-relative local coordinates
     * @param {object} screenPos - {x, y} relative to viewport
     * @param {object} mapOffset - {x, y} position of mapContent container
     * @param {number} scale - current scale
     * @returns {object} {x, y} grid-local coordinates
     */
    getGridLocal(screenPos, mapOffset, scale) {
        return {
            x: (screenPos.x - mapOffset.x) / scale,
            y: (screenPos.y - mapOffset.y) / scale
        };
    },

    /**
     * Calculates the required mapContent offset to keep a grid-local point at a specific screen position
     * @param {object} screenPos - {x, y} target screen position
     * @param {object} gridLocal - {x, y} grid-local position to keep stable
     * @param {number} scale - target scale
     * @returns {object} {x, y} required mapContent offset
     */
    getMapOffset(screenPos, gridLocal, scale) {
        return {
            x: screenPos.x - gridLocal.x * scale,
            y: screenPos.y - gridLocal.y * scale
        };
    }
};
