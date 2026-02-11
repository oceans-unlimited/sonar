/**
 * Color Operations Utility
 * Provides a unified interface for applying color changes to PixiJS objects
 * and custom components, with support for cascading updates strings.
 */

import { Container } from 'pixi.js';

/**
 * Universal color setter.
 * Handles:
 * 1. Components with a setTint() method
 * 2. Standard PixiJS objects with a 'tint' property
 * 3. Objects with a 'background' sprite (fallback)
 * 
 * @param {Object} target - The object to recolor
 * @param {number} color - Hex color value (e.g. 0xFF0000)
 */
export const setColor = (target, color) => {
    if (!target) return;

    // 1. Component Protocol (Custom Methods)
    if (typeof target.setTint === 'function') {
        target.setTint(color);
        return;
    }

    // 2. Standard PixiJS Visuals (Sprite, Graphics, Text, BitmapText)
    if ('tint' in target) {
        target.tint = color;
    }

    // 3. Fallback: Common pattern in this codebase (Button.background)
    // Only use if target is NOT a standard visual itself (which would have caught above)
    // and doesn't have a setTint method.
    if (target.background && 'tint' in target.background) {
        target.background.tint = color;
    }
};

/**
 * Recursively applies color to children matching a selector.
 * 
 * @param {Container} container - The root container
 * @param {number} color - The color to apply
 * @param {Function|string|Object} matcher - Filter criteria
 *        - If string: matches child.name or child.label
 *        - If function: matches if matcher(child) returns true
 *        - If null/undefined: matches ALL children
 * @param {boolean} recursive - Whether to traverse deep (default: true)
 */
export const cascadeColor = (container, color, matcher = null, recursive = true) => {
    if (!container || !container.children) return;

    container.children.forEach(child => {
        // 1. Determine match
        let isMatch = false;

        if (!matcher) {
            isMatch = true;
        } else if (typeof matcher === 'string') {
            isMatch = child.label === matcher;
        } else if (typeof matcher === 'function') {
            isMatch = matcher(child);
        }

        // 2. Apply color if matched
        if (isMatch) {
            setColor(child, color);
        }

        // 3. Recurse
        if (recursive && child.children && child.children.length > 0) {
            cascadeColor(child, color, matcher, recursive);
        }
    });
};
