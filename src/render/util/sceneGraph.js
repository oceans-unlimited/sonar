/**
 * Scene Graph Utilities
 */

/**
 * Recursively climbs the scene graph to find the root Stage.
 * In PixiJS, the stage is the topmost container with no parent.
 * 
 * @param {import('pixi.js').Container} displayObject - The object to start searching from.
 * @returns {import('pixi.js').Container} The root stage.
 */
export function getStage(displayObject) {
    if (!displayObject.parent) {
        return displayObject;
    }
    return getStage(displayObject.parent);
}

/**
 * Finds the nearest parent with a specific label or property.
 * @param {import('pixi.js').Container} displayObject 
 * @param {string} label 
 * @returns {import('pixi.js').Container|null}
 */
export function findParentByLabel(displayObject, label) {
    if (!displayObject || !displayObject.parent) return null;
    if (displayObject.parent.label === label) return displayObject.parent;
    return findParentByLabel(displayObject.parent, label);
}
