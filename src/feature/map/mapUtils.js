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
     * Converts alphanumeric grid coordinates (e.g., 'F3') to numeric values (row: 2, col: 5).
     * @param {string} alphaNumeric - The alphanumeric coordinate.
     * @returns {object|null} { row, col } or null if invalid format.
     */
    toNumeric(alphaNumeric) {
        if (!alphaNumeric || alphaNumeric.length < 2) return null;
        const colStr = alphaNumeric.charAt(0).toUpperCase();
        const rowStr = alphaNumeric.substring(1);
        
        const col = colStr.charCodeAt(0) - 65;
        const row = parseInt(rowStr, 10) - 1;
        
        if (isNaN(row) || col < 0 || col >= 15 || row < 0 || row >= 15) return null;
        
        return { row, col };
    },

    /**
     * Returns the cardinal direction from point p1 to point p2.
     * Only works for direct orthogonal moves.
     * @param {object} p1 - { row, col }
     * @param {object} p2 - { row, col }
     * @returns {string|null} 'N', 'S', 'E', 'W' or null.
     */
    getDirection(p1, p2) {
        if (p2.row < p1.row) return 'N';
        if (p2.row > p1.row) return 'S';
        if (p2.col < p1.col) return 'W';
        if (p2.col > p1.col) return 'E';
        return null;
    },

    /**
     * Gets possible moves for a given coordinate.
     * @param {object} coords - { row, col }
     * @param {boolean} stealth - Whether to permit stealth moves (up to 4 spaces).
     * @returns {Array} Array of { row, col, direction }
     */
    getPossibleMoves(coords, stealth = false) {
        const moves = [];
        const range = stealth ? 4 : 1;
        const directions = [
            { id: 'N', dr: -1, dc: 0 },
            { id: 'S', dr: 1, dc: 0 },
            { id: 'E', dr: 0, dc: 1 },
            { id: 'W', dr: 0, dc: -1 }
        ];

        directions.forEach(dir => {
            for (let i = 1; i <= range; i++) {
                moves.push({
                    row: coords.row + dir.dr * i,
                    col: coords.col + dir.dc * i,
                    direction: dir.id
                });
            }
        });

        return moves;
    },

    /**
     * Filters out invalid moves based on game rules.
     * @param {object} state - Global game state (contains board).
     * @param {object} ownship - Submarine data (pos, track, mines, etc).
     * @param {Array} moves - Array of { row, col, direction } from getPossibleMoves.
     * @returns {Array} Filtered array of valid moves.
     */
    filterInvalidMoves(state, ownship, moves) {
        if (!state || !ownship || !moves) return [];
        
        const board = state.board;
        const gridSize = board.length;
        const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };
        const lastMove = ownship.submarineStateData?.MOVED?.directionMoved || 
                         ownship.submarineStateData?.POST_MOVEMENT?.directionMoved;

        return moves.filter(move => {
            // 1. Map edges
            if (move.row < 0 || move.row >= gridSize || move.col < 0 || move.col >= board[0].length) return false;

            // 2. Last move direction (no 180 reversals)
            if (lastMove && lastMove !== ' ' && move.direction === opposite[lastMove]) return false;

            // 3. Straight-line obstacle check (LAND, past_track, mines block path)
            const dr = Math.sign(move.row - ownship.row);
            const dc = Math.sign(move.col - ownship.col);
            const dist = Math.max(Math.abs(move.row - ownship.row), Math.abs(move.col - ownship.col));

            for (let i = 1; i <= dist; i++) {
                const checkR = ownship.row + dr * i;
                const checkC = ownship.col + dc * i;

                // Terrain (LAND is 1)
                if (board[checkR][checkC] !== 0) return false;

                // Past Track
                const inTrack = ownship.past_track?.some(p => p.row === checkR && p.col === checkC);
                if (inTrack) return false;

                // Own Mines
                const isMine = ownship.mines?.some(m => m.row === checkR && m.col === checkC);
                if (isMine) return false;
            }

            return true;
        });
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
            // Support both object {type} and raw integer terrain
            const raw = terrain[row][col];
            terrainType = (typeof raw === 'object') ? (raw.type || 'WATER') : (raw === 0 ? 'WATER' : 'LAND');
        }

        // Check various conditions
        const isOwnMine = ownship?.mines?.some(mine => mine.row === row && mine.col === col) || false;
        const isInPastTrack = ownship?.past_track?.some(track => track.row === row && track.col === col) || false;
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
    },

    /**
     * Returns the grid boundaries for a given sector (1-9).
     * @param {number} sectorId - Sector ID (1-9)
     * @returns {object} { minRow, maxRow, minCol, maxCol }
     */
    getSectorBounds(sectorId) {
        const id = Math.max(1, Math.min(9, sectorId)) - 1;
        const sRow = Math.floor(id / 3);
        const sCol = id % 3;

        return {
            minRow: sRow * 5,
            maxRow: (sRow * 5) + 4,
            minCol: sCol * 5,
            maxCol: (sCol * 5) + 4
        };
    },

    /**
     * Gets the pixel center of a sector for label positioning.
     * @param {number} sectorId - Sector ID (1-9)
     * @param {number} scale - Current map scale
     * @returns {object} { x, y }
     */
    getSectorCenter(sectorId, scale) {
        const bounds = this.getSectorBounds(sectorId);
        return {
            x: (bounds.minCol * scale) + (2.5 * scale),
            y: (bounds.minRow * scale) + (2.5 * scale)
        };
    },

    /**
     * Get the layout info of a container or child.
     *
     * @param {PIXI.Container | LayoutContainer} target - The Pixi container or layout node.
     * @param {'computed' | 'computedPixi'} type - Which layout values to return.
     * @returns {object | null} The layout object, or null if not available yet.
     */
    getLayout(target, type = 'computed') {
        if (!target || !target.layout) return null;

        // Wait for valid layout values
        if (type === 'computed') {
            return target.layout.computedLayout || null;
        }
        if (type === 'computedPixi') {
            return target.layout.computedPixiLayout || null;
        }
        console.warn(`Invalid layout type: ${type}`);
        return null;
    }
};
