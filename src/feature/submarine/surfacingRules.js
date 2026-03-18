/**
 * Surfacing Rules
 * Pure functions for handling the transition from submerged to surfaced.
 */

import { MapUtils } from '../map/mapUtils';

/**
 * Returns a new state object with the past track cleared.
 * This should be used when a submarine surfaces.
 * 
 * @param {object} subData - Raw submarine data object.
 * @returns {object} Updated data with empty past_track.
 */
export function clearTrack(subData) {
    return {
        ...subData,
        past_track: []
    };
}

/**
 * Returns a human-readable surfacing message.
 * @param {number} row 
 * @param {number} col 
 * @returns {string}
 */
export function getSurfacingAnnouncement(row, col) {
    const sector = MapUtils.getSector(row, col);
    const coords = MapUtils.toAlphaNumeric(row, col);
    return `EMERGENCY SURFACE - Sector ${sector} (${coords})`;
}
