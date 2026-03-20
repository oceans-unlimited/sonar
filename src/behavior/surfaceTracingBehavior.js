/**
 * Surface Tracing Behavior
 * Manages the mechanical UI state of the surfacing mini-game trace.
 *
 * Responsibilities:
 * - Wire pointer events (pointerdown, pointermove, pointerup) to the track container.
 * - Manage drawing the trace line mechanically.
 * - Enforce raster mask validation.
 * - Detect distance-based node interactions.
 * - Fire game-state events to the Controller.
 */

import { setColor } from '../render/util/colorOps.js';
import { Rectangle } from 'pixi.js';

function debugOverlayLog(msg) {
    const el = document.getElementById('debug-log');
    if (el) {
        const div = document.createElement('div');
        div.style.color = '#00ff00';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '12px';
        div.textContent = `[Trace] ${msg}`;
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }
    console.log(`[Trace] ${msg}`);
}

export const NODE_RADIUS = 30; // Hit detection radius for nodes
const MAX_STEP_DISTANCE = 100; // Max allowed pixels between frames (anti-cheat)
const MIN_MOTION_DISTANCE = 5;  // Minimum pixels required to register a new trace point (anti-jitter)

const _pixelCache = new Map();

/**
 * Extracts pixel data from a sprite using the global Pixi app renderer.
 * Results are cached globally to avoid repeated GPU reads.
 */
async function extractPixels(sprite) {
    const textureUid = sprite.texture.uid;
    if (_pixelCache.has(textureUid)) {
        return _pixelCache.get(textureUid);
    }

    const app = globalThis.__PIXI_APP__;
    if (!app) {
        console.warn('[TracingBehavior] No global app found for pixel extraction.');
        return null;
    }
    // Asynchronous extract in Pixi gives a Uint8Array of pixel data [R,G,B,A, R,G,B,A...]
    try {
        let uint8Data;
        const logicalWidth = sprite.texture.width;
        const logicalHeight = sprite.texture.height;
        let resWidth = logicalWidth;
        let resHeight = logicalHeight;
        let resolution = 1;

        // Try Canvas 2D extraction first for 100% 1:1 pixel mapping 
        // Bypasses Pixi bounds trimming, visual state alpha traps, and WebGL resolution scaling
        const sourceImg = (sprite.texture.source && sprite.texture.source.resource) || 
                          (sprite.texture.baseTexture && sprite.texture.baseTexture.resource.source);
                          
        if (sourceImg && (sourceImg instanceof HTMLImageElement || sourceImg instanceof HTMLCanvasElement || sourceImg instanceof ImageBitmap)) {
            const canvas = document.createElement('canvas');
            canvas.width = logicalWidth;
            canvas.height = logicalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // Draw pure source image 
            ctx.drawImage(sourceImg, 0, 0, logicalWidth, logicalHeight);
            uint8Data = ctx.getImageData(0, 0, logicalWidth, logicalHeight).data;
        } else {
            // Fallback to PixiJS WebGL extract if pure image isn't available
            const oldAlpha = sprite.alpha;
            sprite.alpha = 1;
            const pixels = await app.renderer.extract.pixels(sprite);
            sprite.alpha = oldAlpha;
            
            uint8Data = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels);
            resolution = app.renderer.resolution || 1;
            resWidth = Math.round(logicalWidth * resolution);
            resHeight = Math.round(logicalHeight * resolution);
        }

        const result = {
            data: uint8Data,
            logicalWidth: logicalWidth,
            logicalHeight: logicalHeight,
            strideWidth: resWidth,
            strideHeight: resHeight,
            resolution: resolution
        };
        
        _pixelCache.set(textureUid, result);
        return result;
    } catch (e) {
        console.error('[TracingBehavior] Mask pixel extraction failed', e);
        return null;
    }
}

/**
 * Wires tracing behavior onto a built raster surface track.
 *
 * @param {Container} container - The main track container.
 * @param {Container[]} nodes - Array of node containers.
 * @param {Sprite} maskSprite - The hidden raster mask sprite.
 * @param {Graphics} traceGraphics - Graphics object for drawing the progress line.
 * @param {object} config
 * @param {Array<{x, y}>} config.checkpoints - Coordinate data for nodes.
 * @param {object} config.traceStyle - Properties for the PixiJS stroke (width, color, etc).
 * @param {Function} config.onTraceStart - Callback fired when tracing begins.
 * @param {Function} config.onTargetReached - Callback when the target node is hit.
 * @param {Function} config.onBreach - Callback when player fails tracing constraint.
 * @returns {Promise<object>} Control API: { setActiveNode, setTargetNode, resetTrace, destroy }
 */
export async function wireSurfaceTracing(container, nodes, maskSprite, traceGraphics, config) {
    const { checkpoints, traceStyle, onTraceStart, onTargetReached, onBreach } = config;

    let isTracing = false;
    let activeIndex = -1;
    let targetIndex = -1;

    // Cache mask data
    const maskPixels = await extractPixels(maskSprite);

    if (maskPixels) {
        container.hitArea = new Rectangle(0, 0, maskPixels.logicalWidth, maskPixels.logicalHeight);
        debugOverlayLog(`Mask extracted. HitArea set: ${maskPixels.logicalWidth}x${maskPixels.logicalHeight} (Res: ${maskPixels.resolution})`);
    } else {
        container.hitArea = new Rectangle(0, 0, 800, 800);
        debugOverlayLog(`WARNING: Mask extraction failed. Using fallback HitArea.`);
    }

    // Track the points traversed in the current segment to draw the trace line
    let segmentPoints = [];

    // ─── Verification Helpers ───
    
    function distance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    function getMaskSample(localX, localY) {
        if (!maskPixels) return { r: 0, g: 0, b: 0, a: 0 };
        const rx = Math.floor(localX * maskPixels.resolution);
        const ry = Math.floor(localY * maskPixels.resolution);
        if (rx < 0 || ry < 0 || rx >= maskPixels.strideWidth || ry >= maskPixels.strideHeight) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        const i = (ry * maskPixels.strideWidth + rx) * 4;
        return {
            r: maskPixels.data[i],
            g: maskPixels.data[i + 1],
            b: maskPixels.data[i + 2],
            a: maskPixels.data[i + 3]
        };
    }

    function checkMaskHitAt(localX, localY) {
        if (!maskPixels) return true; // Failsafe if pixel extraction failed
        
        const sample = getMaskSample(localX, localY);
        
        // Works for both transparent-background (alpha=0) and opaque black-background (R=0)
        return sample.a > 50 && sample.r > 50; 
    }

    // ─── Drawing (Interpolation) ───

    function redrawTrace() {
        traceGraphics.clear();
        const len = segmentPoints.length;
        if (len === 0) return;

        traceGraphics.moveTo(segmentPoints[0].x, segmentPoints[0].y);
        
        // Quadratic curve interpolation for smoothed trace lines
        if (len < 3) {
            for (let i = 1; i < len; i++) {
                traceGraphics.lineTo(segmentPoints[i].x, segmentPoints[i].y);
            }
        } else {
            for (let i = 1; i < len - 1; i++) {
                const p1 = segmentPoints[i];
                const p2 = segmentPoints[i + 1];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                traceGraphics.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }
            // Draw a straight line to the absolute final point
            traceGraphics.lineTo(segmentPoints[len - 1].x, segmentPoints[len - 1].y);
        }
        
        // Behaviors do NOT set the raw colors mechanically, only pass through the injected style config
        traceGraphics.stroke(traceStyle);
    }

    function triggerBreach(reason) {
        if (!isTracing) return;
        isTracing = false;
        segmentPoints = [];
        traceGraphics.clear();
        
        debugOverlayLog(`BREACHED! Reason: ${reason}`);
        if (onBreach) onBreach();
    }

    // ─── Pointer Handlers ───
    
    function onPointerDown(e) {
        if (activeIndex === -1 || targetIndex === -1) return;
        
        const local = container.toLocal(e.global);
        const activeCp = checkpoints[activeIndex];
        const dist = distance(local, activeCp);
        
        debugOverlayLog(`PointerDown @(${Math.round(local.x)},${Math.round(local.y)}). Dist to Node ${activeIndex + 1} = ${Math.round(dist)}`);

        if (dist < NODE_RADIUS) {
            // Valid start
            isTracing = true;
            segmentPoints = [{ x: activeCp.x, y: activeCp.y }]; // Start line precisely at node center
            debugOverlayLog(`>> Trace Started from Node ${activeIndex + 1}`);
            if (onTraceStart) onTraceStart();
        }
    }

    function onPointerMove(e) {
        if (!isTracing) return;

        const local = container.toLocal(e.global);
        
        // 1. Pixel / Zone Validation
        const activeCp = checkpoints[activeIndex];
        const targetCp = checkpoints[targetIndex];
        
        const distToActive = activeCp ? distance(local, activeCp) : Infinity;
        const distToTarget = targetCp ? distance(local, targetCp) : Infinity;

        // The hit mask validation is only enforced outside of the node safe zones
        if (distToActive > NODE_RADIUS && distToTarget > NODE_RADIUS) {
            const validPath = checkMaskHitAt(local.x, local.y);
            if (!validPath) {
                const sample = getMaskSample(local.x, local.y);
                triggerBreach(`Exited mask path at (${Math.round(local.x)}, ${Math.round(local.y)}). Sample: R=${sample.r}, A=${sample.a}`);
                return;
            }
        }

        // 2. Anti-cheat / skipping validation / Anti-jitter
        const lastPoint = segmentPoints[segmentPoints.length - 1];
        const distFromLast = distance(local, lastPoint);

        if (distFromLast > MAX_STEP_DISTANCE) {
            triggerBreach(`Anti-skip triggered. Step: ${Math.round(distFromLast)}px`); 
            return;
        }

        if (distFromLast < MIN_MOTION_DISTANCE) {
            return; // Ignore minor mouse jitter
        }

        segmentPoints.push(local);
        redrawTrace();

        // 4. Check Target Node Reached (Continuous Trace Advance)
        if (targetCp && distToTarget < NODE_RADIUS) {
            debugOverlayLog(`>> Target Node ${targetIndex + 1} Reached! (Continuous)`);
            
            // Snap the active line exactly to the node
            segmentPoints.push({ x: targetCp.x, y: targetCp.y });
            redrawTrace(); 
            
            const savedPoints = [...segmentPoints];
            
            // For continuous tracing, reset mechanical tracking segment to start from this node securely
            segmentPoints = [{ x: targetCp.x, y: targetCp.y }];

            if (onTargetReached) onTargetReached(targetIndex, savedPoints);
        }
    }

    function onPointerUp(e) {
        if (!isTracing) return;
        
        const local = container.toLocal(e.global);
        const activeCp = checkpoints[activeIndex];
        const targetCp = checkpoints[targetIndex];

        debugOverlayLog(`PointerUp @(${Math.round(local.x)}, ${Math.round(local.y)})`);

        if (targetCp && distance(local, targetCp) < NODE_RADIUS) {
            // Segmented Trace Advance
            debugOverlayLog(`>> Target Node ${targetIndex + 1} Reached on Release!`);
            
            segmentPoints.push({ x: targetCp.x, y: targetCp.y });
            const savedPoints = [...segmentPoints];
            
            isTracing = false;
            segmentPoints = [];
            traceGraphics.clear();

            if (onTargetReached) onTargetReached(targetIndex, savedPoints);
        } else if (activeCp && distance(local, activeCp) < NODE_RADIUS) {
            // Graceful pause on the active node (e.g. they stopped after a continuous advance)
            debugOverlayLog(`Trace safely paused at Node ${activeIndex + 1}`);

            isTracing = false;
            segmentPoints = [];
            traceGraphics.clear();
        } else {
            triggerBreach('Pointer released outside a valid node safe-zone');
        }
    }

    // ─── Wire Events ───
    
    container.eventMode = 'static';
    container.cursor = 'crosshair';
    container.on('pointerdown', onPointerDown);
    container.on('pointermove', onPointerMove);
    container.on('pointerup', onPointerUp);
    container.on('pointerupoutside', onPointerUp);

    // ─── Public API ───
    return {
        /**
         * Sets the current node where tracking is permitted to begin.
         * Automatically sets the mechanical 'tracer' state unless keepTracing is flag-provided.
         */
        setActiveNode(index, keepTracing = false) {
            activeIndex = index;
            if (!keepTracing) {
                isTracing = false;
                segmentPoints = [];
                traceGraphics.clear();
            }
        },
        
        /**
         * Sets the target node that the tracer must reach.
         */
        setTargetNode(index) {
            targetIndex = index;
        },

        /**
         * Clears active tracing progress when a reset is issued (e.g. from breach).
         */
        resetTrace() {
            isTracing = false;
            segmentPoints = [];
            traceGraphics.clear();
        },

        destroy() {
            container.removeAllListeners();
            container.eventMode = 'none';
        }
    };
}
