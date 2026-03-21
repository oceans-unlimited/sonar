import { Container, Text, Graphics } from 'pixi.js';
import { Colors, SystemColors } from '../core/uiStyle.js';
import { buildSurfaceTrack } from '../feature/surface/SurfaceMiniGameRenderer.js';
import { SurfacePaths } from '../feature/surface/SurfacePathData.js';
import { wireSurfaceTracing } from '../behavior/surfaceTracingBehavior.js';
import { setColor } from '../render/util/colorOps.js';

/**
 * SurfaceTestScene
 * Bare testbed — mounts the tracing mini-game directly with no server panels.
 * Operates a mock controller loop to test the continuous trace mechanics.
 */
export function createSurfaceTestScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'surfaceTestScene';

    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: 20
    };

    const trackColor = Colors.primary;
    const pathData = SurfacePaths['path_01'];

    const { container: trackContainer, nodes, maskSprite, traceGraphics } = buildSurfaceTrack(trackColor, {
        pathAssetId: pathData.pathAssetId,
        maskAssetId: pathData.maskAssetId,
        checkpoints: pathData.checkpoints
    });

    // Add completed segments graphics (rendered underneath active trace)
    const completedGraphics = new Graphics();
    completedGraphics.mask = maskSprite; // Ensure solid completed strokes don't bleed outside the mask
    trackContainer.addChildAt(completedGraphics, trackContainer.getChildIndex(traceGraphics));

    sceneContent.addChild(trackContainer);

    const statusText = new Text({
        text: 'Loading mask data...',
        style: { fontFamily: 'Courier New', fontSize: 16, fill: Colors.dim, align: 'center' },
        layout: { marginTop: 20 }
    });
    sceneContent.addChild(statusText);

    // --- Interactive Logic (Mocking the Controller) ---
    let behaviorApi = null;
    let currentActiveIndex = 0;

    function applyBaseColors() {
        nodes.forEach((node, i) => {
            const base = node.getChildByLabel('nodeBase');
            if (i < currentActiveIndex) {
                // Completed (Matches active yellow trace fill)
                setColor(base, Colors.surfaceActive);
            } else if (i === currentActiveIndex) {
                // Active start node
                setColor(base, Colors.surfaceActive);
            } else {
                // Future nodes
                setColor(base, Colors.dim);
            }
        });
    }

    // Wire the asynchronous extraction and tracing behavior
    wireSurfaceTracing(trackContainer, nodes, maskSprite, traceGraphics, {
        checkpoints: pathData.checkpoints,
        traceStyle: { width: 55, color: Colors.surfaceActive, alpha: 1, cap: 'round', join: 'round' },
        onTraceStart: () => {
             statusText.text = "Tracing Segment...";
             statusText.style.fill = Colors.active;
             
             const activeNode = nodes[currentActiveIndex];
             setColor(activeNode.getChildByLabel('nodeBase'), Colors.surfaceActive);
             
             // Target node turns weapons red upon trace commit start
             if (currentActiveIndex + 1 < nodes.length) {
                 const targetNode = nodes[currentActiveIndex + 1];
                 setColor(targetNode.getChildByLabel('nodeBase'), SystemColors.weapons);
             }
        },
        onTargetReached: (targetIndex, points) => {
             // Record exact hand-drawn segment visual
             if (points && points.length > 0) {
                 completedGraphics.moveTo(points[0].x, points[0].y);
                 
                 // Apply exact same quadratic smoothing as the behavior uses
                 if (points.length < 3) {
                     for (let i = 1; i < points.length; i++) {
                         completedGraphics.lineTo(points[i].x, points[i].y);
                     }
                 } else {
                     for (let i = 1; i < points.length - 1; i++) {
                         const p1 = points[i];
                         const p2 = points[i + 1];
                         const midX = (p1.x + p2.x) / 2;
                         const midY = (p1.y + p2.y) / 2;
                         completedGraphics.quadraticCurveTo(p1.x, p1.y, midX, midY);
                     }
                     completedGraphics.lineTo(points[points.length - 1].x, points[points.length - 1].y);
                 }
                 completedGraphics.stroke({ width: 55, color: Colors.surfaceActive, cap: 'round', join: 'round' });
             }

             currentActiveIndex = targetIndex;

             if (currentActiveIndex >= nodes.length - 1) {
                 statusText.text = "TRACE COMPLETE!";
                 statusText.style.fill = Colors.success;
                 behaviorApi.setActiveNode(-1); // Stop tracing
                 applyBaseColors(); // ensure final node is green
                 return;
             }

             statusText.text = `Hit Checkpoint ${targetIndex + 1}! Keep tracing...`;
             
             // Step sequence forward while keeping the mechanical line active
             behaviorApi.setActiveNode(currentActiveIndex, true);
             behaviorApi.setTargetNode(currentActiveIndex + 1);
             
             // Nodes colors update to rest state (active is yellow, future is dim)
             applyBaseColors();
        },
        onBreach: () => {
             statusText.text = "Breach! Trace reset to last active checkpoint.";
             statusText.style.fill = Colors.danger;
             
             // Reset trace safely back to current active node
             behaviorApi.resetTrace();
             behaviorApi.setActiveNode(currentActiveIndex);
             behaviorApi.setTargetNode(currentActiveIndex + 1);
             
             // Re-apply base setup colors (active node gets yellow again)
             applyBaseColors();
        }
    }).then(api => {
        behaviorApi = api;
        behaviorApi.setActiveNode(0);
        behaviorApi.setTargetNode(1);
        applyBaseColors();
        statusText.text = 'Interactive Trace Ready - Click Node 1 to Start';
        statusText.style.fill = Colors.active;
    });

    return sceneContent;
}
