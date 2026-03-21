import { BaseController } from '../../control/baseController';
import { buildSurfaceTrack } from './SurfaceMiniGameRenderer.js';
import { wireSurfaceTracing } from '../../behavior/surfaceTracingBehavior.js';
import { Colors } from '../../core/uiStyle.js';
import { SurfacePaths } from './SurfacePathData.js';

/**
 * SurfaceController
 * Feature controller for managing the surfacing lifecycle, crew tasks,
 * and the tracing mini-game.
 *
 * Role sequencing: CO → XO → Sonar → Engineer
 */

const SURFACING_ROLE_ORDER = ['co', 'xo', 'sonar', 'eng'];

const ROLE_COLORS = {
    co: Colors.roleCaptain,
    xo: Colors.roleXO,
    sonar: Colors.roleSonar,
    eng: Colors.roleEngineer
};

export class SurfaceController extends BaseController {
    constructor() {
        super();

        /** @type {string|null} The local player's role key. */
        this.localRole = null;

        /** @type {Container|null} The currently mounted mini-game container. */
        this._trackContainer = null;

        /** @type {object|null} The tracing behavior control API. */
        this._tracingBehavior = null;

        /** @type {string|null} The role currently performing the trace. */
        this._activeRole = null;

        this.handlers = {
            ...this.handlers,
            /**
             * TRIGGER: Captain initiates surfacing.
             */
            'REQUEST_SURFACE': () => this.requestSurface(),
            /**
             * TRIGGER: Crew member completes a surfacing task.
             */
            'COMPLETE_TASK': () => this.completeTask(),
            /**
             * TRIGGER: Final submerge command once surfaced.
             */
            'REQUEST_SUBMERGE': () => this.requestSubmerge(),
            /**
             * TRIGGER: Server tells us whose turn it is to trace.
             */
            'SURFACE_ROLE_ACTIVE': (payload) => this.onRoleActive(payload),
            /**
             * TRIGGER: Server / local — surfacing sequence cancelled or complete.
             */
            'SURFACE_END': () => this.teardownMiniGame()
        };
    }

    // ─────────── Server Communication ───────────

    requestSurface() {
        if (this.socket) {
            console.log('[SurfaceController] Requesting surface...');
            this.socket.emit('surface');
        }
    }

    completeTask() {
        if (this.socket) {
            console.log('[SurfaceController] Completing role task...');
            this.socket.emit('complete_surfacing_task');
        }
    }

    requestSubmerge() {
        const subController = this.features?.get('submarine');
        const sub = subController?.getOwnship();

        if (this.socket && sub) {
            console.log(`[SurfaceController] Requesting submerge for sub ${sub.getId()}`);
            this.socket.emit('submerge', sub.getId());
        }
    }

    // ─────────── Mini-Game Lifecycle ───────────

    /**
     * Called when the server broadcasts which role should perform the trace.
     * @param {{ role: string }} payload
     */
    onRoleActive(payload) {
        const { role } = payload;
        this._activeRole = role;

        if (role === this.localRole) {
            this.mountMiniGame(role);
        } else {
            // Not our turn — could show a standby indicator
            console.log(`[SurfaceController] Standby — ${role} is surfacing.`);
        }
    }

    /**
     * Builds and mounts the tracing mini-game into the scene graph.
     * Hides the main interactive panels while keeping interrupt/damage visible.
     * @param {string} role - The role performing the trace.
     */
    mountMiniGame(role) {
        // Tear down any existing instance
        this.teardownMiniGame();

        const color = ROLE_COLORS[role] || Colors.primary;

        const pathData = SurfacePaths['path_01'];

        // Build the track
        const { container, nodes, maskSprite, traceGraphics } = buildSurfaceTrack(color, {
            pathAssetId: pathData.pathAssetId,
            maskAssetId: pathData.maskAssetId,
            checkpoints: pathData.checkpoints
        });

        // Wire tracing behavior
        wireSurfaceTracing(container, nodes, maskSprite, traceGraphics, {
            checkpoints: pathData.checkpoints,
            traceStyle: { width: 55, color, alpha: 1, cap: 'round', join: 'round' },
            onTraceStart: () => {},
            onTargetReached: (targetIndex) => {
                if (targetIndex >= nodes.length - 1) {
                    console.log(`[SurfaceController] Trace complete for role: ${role}`);
                    this.completeTask();
                    this.teardownMiniGame();
                } else {
                    if (this._tracingBehavior) {
                        this._tracingBehavior.setActiveNode(targetIndex, true);
                        this._tracingBehavior.setTargetNode(targetIndex + 1);
                    }
                }
            },
            onBreach: () => {
                console.log(`[SurfaceController] Trace breach — resetting.`);
                if (this._tracingBehavior) {
                    this._tracingBehavior.resetTrace();
                    // Need a full mock or sync to reset to current segment, for now reset all
                    this._tracingBehavior.setActiveNode(0);
                    this._tracingBehavior.setTargetNode(1);
                }
            }
        }).then(api => {
            this._tracingBehavior = api;
            if (this._tracingBehavior) {
                this._tracingBehavior.setActiveNode(0);
                this._tracingBehavior.setTargetNode(1);
            }
        });

        this._trackContainer = container;

        // Mount into view if available
        const view = this.view;
        if (view) {
            // Hide main scene panels (preserve interrupt/damage overlays)
            this._hidePanels(view);
            view.addChild(container);
        }
    }

    /**
     * Removes the mini-game from the scene graph and restores panels.
     */
    teardownMiniGame() {
        if (this._tracingBehavior) {
            this._tracingBehavior.destroy();
            this._tracingBehavior = null;
        }

        if (this._trackContainer) {
            if (this._trackContainer.parent) {
                this._trackContainer.parent.removeChild(this._trackContainer);
            }
            this._trackContainer.destroy({ children: true });
            this._trackContainer = null;
        }

        // Restore panels
        if (this.view) {
            this._showPanels(this.view);
        }

        this._activeRole = null;
    }

    // ─────────── Panel Visibility ───────────

    /**
     * Hide main interactive panels while preserving overlays.
     * Uses PixiJS `visible` property.
     */
    _hidePanels(view) {
        if (!view?.children) return;
        view.children.forEach(child => {
            // Keep interrupt overlays, damage UIs, and teletype visible
            const label = child.label || '';
            const isOverlay = label.includes('interrupt') ||
                              label.includes('damage') ||
                              label.includes('teletype') ||
                              label.includes('surfaceTrack');
            if (!isOverlay) {
                child._wasSurfaceHidden = true;
                child.visible = false;
            }
        });
    }

    _showPanels(view) {
        if (!view?.children) return;
        view.children.forEach(child => {
            if (child._wasSurfaceHidden) {
                child.visible = true;
                delete child._wasSurfaceHidden;
            }
        });
    }
}
