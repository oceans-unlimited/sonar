import { Container } from 'pixi.js';
import { SubmarineAnimation } from './subAnimation.js';

/**
 * Creates a debug scene to test submarine rotation + movement logic.
 * @param {PIXI.Application} app
 * @param {Object} assets - must contain submarine spritesheet or texture
 */
export function createDebugRotationScene(app, assets) {
    const sceneContainer = new Container();
    app.stage.addChild(sceneContainer);

    // Example: reject movement into blocked directions (can be dynamic)
    const isValidDirection = (dir) => {
        // Example: pretend 'W' and 'SW' are blocked by map boundaries
        const blocked = new Set(['']);
        return !blocked.has(dir);
    };

    // Ensure the submarine spritesheet is available
    if (!assets.sub_sheet) {
        console.error('⚠️ Missing \'sub_sheet\' spritesheet in assets for SubmarineAnimation!');
        return sceneContainer;
    }

    // Instantiate SubmarineAnimation
    const subAnimation = new SubmarineAnimation(app, sceneContainer, assets, isValidDirection);

    // Key controls mapping
    const keyDirMap = {
        'ArrowUp': 'N',
        'ArrowDown': 'S',
        'ArrowLeft': 'W',
        'ArrowRight': 'E',
    };

    // Handle keyboard input (sequential, no chaining)
    const onKeyDown = async (e) => {
        const newDir = keyDirMap[e.key];
        if (!newDir) return;
        await subAnimation.startTurn(newDir);
    };

    window.addEventListener('keydown', onKeyDown);

    // Cleanup routine for scene teardown
    sceneContainer.destroy = function (options) {
        window.removeEventListener('keydown', onKeyDown);
        subAnimation.destroy();
        Container.prototype.destroy.call(this, options);
    };

    return sceneContainer;
}
