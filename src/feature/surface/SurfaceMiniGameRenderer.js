/**
 * SurfaceMiniGameRenderer
 * Stateless visual construction of the raster-based tracing track.
 *
 * Rules:
 * - NO events, NO state, NO server calls.
 * - Creates strictly visual Pixi objects.
 * - Extracts/holds visual raster mask and path images.
 */

import { Container, Sprite, Graphics, Text, Assets } from 'pixi.js';
import { Fonts, Colors } from '../../core/uiStyle.js';

// ─────────── Constants ───────────
const NODE_SCALE = 1;
const BASE_ALPHA = 1;

/**
 * Creates a single node graphic with a numbered label.
 * @param {number} index - 0-based index of the node.
 * @param {number} color - Tint color.
 * @returns {Container}
 */
function createNode(index, color) {
    const wrap = new Container();
    wrap.label = `surface_node_${index + 1}`;

    const baseTexture = Assets.cache.get('surfacing_node');

    const baseSprite = new Sprite(baseTexture);
    baseSprite.label = 'nodeBase';
    baseSprite.anchor.set(0.5);
    baseSprite.scale.set(NODE_SCALE);
    baseSprite.tint = Colors.dim;
    baseSprite.alpha = BASE_ALPHA;
    wrap.addChild(baseSprite);

    const fillSprite = new Sprite(baseTexture);
    fillSprite.label = 'nodeFill';
    fillSprite.anchor.set(0.5);
    fillSprite.scale.set(NODE_SCALE);
    fillSprite.tint = color;
    fillSprite.alpha = 0;
    wrap.addChild(fillSprite);

    const label = new Text({
        text: `${index + 1}`,
        style: {
            fontFamily: Fonts.headerBold,
            fontSize: 28,
            fill: Colors.background,
            fontWeight: 'bold'
        }
    });
    label.label = 'nodeLabel';
    label.anchor.set(0.5);
    wrap.addChild(label);

    wrap.interactive = false;
    wrap.eventMode = 'none';

    return wrap;
}

/**
 * Builds the complete surfacing mini-game track layer.
 *
 * @param {number} color - Role-specific tint color for elements.
 * @param {object} options
 * @param {string} [options.pathAssetId='surface_path_01'] - Asset alias for the path visual texture
 * @param {string} [options.maskAssetId='surface_mask_01'] - Asset alias for the hit mask texture
 * @param {Array<{x, y}>} [options.checkpoints=[]] - Local coordinates for each node/checkpoint
 * @returns {{ container: Container, nodes: Container[], segments: Array, pathSprite: Sprite, maskSprite: Sprite, traceGraphics: Graphics }}
 */
export function buildSurfaceTrack(color, options = {}) {
    const {
        pathAssetId = 'surface_path_01',
        maskAssetId = 'surface_mask_01',
        checkpoints = []
    } = options;

    const container = new Container();
    container.label = 'surfaceTrack';

    // 1. Fetch Textures
    const pathTexture = Assets.cache.get(pathAssetId);
    const maskTexture = Assets.cache.get(maskAssetId);

    // 2. Create the Hit Mask Layer
    // Standard is alpha 0, but can be forced visible for layout debugging
    const maskSprite = new Sprite(maskTexture);
    maskSprite.label = 'surfaceMask';
    maskSprite.anchor.set(0);
    container.addChild(maskSprite);

    // 3. Create the Visual Path Layer
    const pathSprite = new Sprite(pathTexture);
    pathSprite.label = 'surfacePathLayer';
    pathSprite.anchor.set(0);
    pathSprite.tint = color;
    container.addChild(pathSprite);

    // 4. Trace Graphics Layer
    // Layered ON TOP of the visual path but strictly clipped by the hit mask shape
    const traceGraphics = new Graphics();
    traceGraphics.label = 'traceGraphics';
    traceGraphics.mask = maskSprite;
    container.addChild(traceGraphics);

    // 5. Checkpoints
    const nodes = [];
    if (checkpoints && checkpoints.length > 0) {
        checkpoints.forEach((cp, i) => {
            const node = createNode(i, color);
            // Coordinates should be relative to the center anchor (0,0)
            node.x = cp.x;
            node.y = cp.y;
            node.zIndex = 10;
            nodes.push(node);
            container.addChild(node);
        });
    }

    // Set layout dimensions to the size of the path texture
    const width = pathTexture ? pathTexture.width : 700;
    const height = pathTexture ? pathTexture.height : 700;

    container.sortableChildren = true;

    container.layout = {
        width: width,
        height: height
    };

    // Return dummy empty segments array to prevent crashing legacy behavior code 
    // during layout tests until the behavior is fully rewritten
    return { container, nodes, segments: [], pathSprite, maskSprite, traceGraphics };
}
