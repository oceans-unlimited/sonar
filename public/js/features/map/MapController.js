import * as PIXI from 'pixi.js';
import { MapConstants, MapStates, MapIntents } from './mapConstants.js';
import { animateMapZoom, animateMapPosition } from './mapEffects.js';
import { MapUtils } from '../../utils/mapUtils.js';
import { socketManager } from '../../core/socketManager.js';
import { SystemColors } from '../../core/uiStyle.js';


/**
 * Map Controller
 * Coordinates map state, renderer, and behaviors.
 * Stubbed/Mocked server interaction per user request.
 */
export class MapController {
    constructor(app, renderer, behaviors) {
        this.app = app;
        this.renderer = renderer;
        this.behaviors = behaviors;

        this.state = MapStates.SELECTING; // Default state
        this.intent = null;
        this.isCentered = true;

        this.previewSquare = null; // formerly hoveredSquare
        this.selectedSquare = null;
        this.ownship = { row: 7, col: 7 }; // Default placeholder
        this.terrain = null;

        this.inactivityTimer = null;
        this.startInactivityTimer();


        this.targetPos = new PIXI.Point(7, 7); // Default center

        this.zoomLevels = [90, 60, 30];

        this.init();
    }

    setState(newState, intent = null) {
        const oldState = this.state;
        const oldIntent = this.intent;

        // Validation: Intent only allowed in SELECTING
        if (intent && newState !== MapStates.SELECTING) {
            console.warn(`[MapController] Invalid State Transition: Intent ${intent} requires SELECTING phase.`);
            intent = null;
        }

        // Exit Logic
        if (this.state === MapStates.SELECTING && newState !== MapStates.SELECTING) {
            this.intent = null;
            this.clearSelection();
        }

        if (this.state === MapStates.PAN && newState !== MapStates.PAN) {
            this.isCentered = false;
        }

        this.state = newState;

        // Entry Logic
        if (newState === MapStates.SELECTING && intent) {
            this.intent = intent;
        }

        // Robust Logging
        const transition = `${oldState}${oldIntent ? `(${oldIntent})` : ''} -> ${this.state}${this.intent ? `(${this.intent})` : ''}`;
        console.log(`%c[MapController]%c Transition: %c${transition}`, 'color: #00ffff; font-weight: bold;', '', 'color: #00ff00;');

        // Event for external listeners (like test harness)
        if (this.renderer?.container) {
            this.renderer.container.emit('map:stateChanged', {
                state: this.state,
                intent: this.intent,
                transition
            });
        }
    }

    init() {
        // Listen for state updates from the socket
        socketManager.on('stateUpdate', (state) => this.handleStateUpdate(state));

        // Handle immediate initialization if state is already available
        if (socketManager.lastState) {
            this.handleStateUpdate(socketManager.lastState);
        }

        this.renderer.renderMap();
        this.renderer.clampPosition();
    }

    handleStateUpdate(state) {
        if (!state || !socketManager.playerId) return;

        // Find which submarine the local player belongs to
        const mySub = state.submarines.find(sub =>
            sub.co === socketManager.playerId ||
            sub.xo === socketManager.playerId ||
            sub.sonar === socketManager.playerId ||
            sub.eng === socketManager.playerId
        );

        if (mySub) {
            // Update Ownship State with Server Data Model
            this.ownship = {
                row: mySub.row,
                col: mySub.col,
                pastTrack: mySub.past_track || [], // snake_case from server
                mines: mySub.mines || [],
                state: mySub.submarineState
            };

            // Tint if in START_POSITIONS
            const isStartPositions = state.phase === 'INTERRUPT' && state.activeInterrupt?.type === 'START_POSITIONS';
            const hasChosen = state.gameStateData?.choosingStartPositions?.submarineIdsWithStartPositionChosen?.includes(mySub.id);

            if (isStartPositions) {
                if (hasChosen) {
                    this.renderer.updateOwnship(this.ownship.row, this.ownship.col, SystemColors.detection);
                } else if (this.renderer.ownshipSprite) {
                    this.renderer.ownshipSprite.visible = false;
                }
            } else {
                this.renderer.updateOwnship(this.ownship.row, this.ownship.col);
            }
            this.syncHUD();
        } else if (this.renderer.ownshipSprite) {
            this.renderer.ownshipSprite.visible = false;
            this.syncHUD();
        }

        // Cache Terrain if available
        if (state.board && (!this.terrain || this.terrain.length === 0)) {
            this.terrain = state.board.map(row =>
                row.map(cell => ({
                    type: cell === 1 ? 'LAND' : 'WATER' // 1 is LAND, 0 is WATER
                }))
            );
            console.log("[MapController] Terrain cached.");
        }
    }



    resize(width, height) {
        this.renderer.setViewport(0, 0, width, height);

        const columns = MapConstants.GRID_SIZE;
        const availableWidth = width - MapConstants.LABEL_GUTTER;
        const minScale = Math.floor(availableWidth / columns);

        const intermediate = Math.floor((MapConstants.DEFAULT_SCALE + minScale) / 2);
        this.zoomLevels = [MapConstants.DEFAULT_SCALE, intermediate, minScale];

        if (this.renderer.currentScale < minScale) {
            this.renderer.currentScale = minScale;
            this.renderer.renderMap();
        }
        this.renderer.clampPosition();
    }

    setZoom(targetScale) {
        if (this.state === MapStates.ANIMATING) return; // Lock during animation
        this.setState(MapStates.ANIMATING);
        this.isCentered = false;
        animateMapZoom(this.app, this.renderer, targetScale, MapConstants.ZOOM_ANIMATION_DURATION, () => {
            this.setState(MapStates.SELECTING);
        });
    }

    stepZoom(direction) {
        const closest = this.findClosestLevel(this.renderer.currentScale);
        const currentIndex = this.zoomLevels.indexOf(closest);
        let nextIndex = currentIndex - direction; // direction 1 is zoom in (index decreases)

        nextIndex = Math.max(0, Math.min(this.zoomLevels.length - 1, nextIndex));
        if (nextIndex !== currentIndex) {
            this.setZoom(this.zoomLevels[nextIndex]);
        }
    }

    findClosestLevel(scale) {
        return this.zoomLevels.reduce((prev, curr) => {
            return (Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev);
        });
    }

    // Activity Management
    handleActivity() {
        if (this.isCentered) {
            if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
            return;
        }
        this.startInactivityTimer();
    }

    startInactivityTimer() {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
            this.onInactivity();
        }, MapConstants.INACTIVITY_TIMEOUT);
    }

    onInactivity() {
        // If inactive in SELECTING, re-center
        if (this.state === MapStates.SELECTING) {
            this.centerOnPosition();
        }
    }

    // Waypoint Logic (Intent Validation)
    validateWaypoint(coords) {
        // Validation Stub
        // TODO: Check against server board data (water vs land), Max range, etc.
        // For now, allow simple bounds check (handled by getGridFromPointer)
        return true;
    }

    centerOnPosition(pos = this.targetPos) {
        this.targetPos = pos;

        const centerX = this.renderer.maskWidth / 2 + MapConstants.LABEL_GUTTER;
        const centerY = this.renderer.maskHeight / 2 + MapConstants.LABEL_GUTTER;

        const mapX = pos.x * this.renderer.currentScale + this.renderer.currentScale / 2;
        const mapY = pos.y * this.renderer.currentScale + this.renderer.currentScale / 2;

        const targetX = centerX - mapX;
        const targetY = centerY - mapY;

        // Smooth transition via mapEffects
        if (this.state === MapStates.ANIMATING) return;
        this.setState(MapStates.ANIMATING);

        animateMapPosition(this.app, this.renderer, targetX, targetY, 400, () => {
            this.isCentered = true;
            this.setState(MapStates.SELECTING);
        });
    }

    // Square Selection
    // Input Handling Commands (from Behaviors)
    // Hover Logic (Input -> Logic -> Render)
    handleHover(coords) {
        // 1. Mechanical Guard
        if (this.state === MapStates.PAN || this.state === MapStates.ANIMATING) return;

        if (this.state !== MapStates.SELECTING) return;

        // 3. Same as previewSquare -> return
        if (this.previewSquare?.row === coords.row && this.previewSquare?.col === coords.col) return;

        // 4. Equals ownship position -> clearPreview and return
        if (this.ownship.row === coords.row && this.ownship.col === coords.col) {
            this.handleHoverOut();
            return;
        }

        // 5. Terrain cache missing -> clearPreview and return
        if (!this.terrain) {
            this.handleHoverOut();
            return;
        }

        // --- Logic Pass ---
        this.previewSquare = coords;
        const terrainType = this.terrain[coords.row][coords.col].type;
        const isNavigable = terrainType === 'WATER';

        // --- Render Dispatch ---
        this.renderer.showHover(coords.row, coords.col, isNavigable);

        // --- HUD Dispatch ---
        // Calculate data
        const range = MapUtils.getRange(this.ownship, coords);
        const sector = MapUtils.getSector(coords.row, coords.col);

        this.renderer.updateHUD({
            ownship: this.ownship,
            target: coords, // Preview acts as target for HUD
            viewport: null, // Not used extensively yet
            cursor: null
        });
    }
    handleHoverOut() {
        if (!this.previewSquare) return;
        this.previewSquare = null;
        this.renderer.clearHover();
        // Clear HUD target part needed? syncHUD does: "target: this.selectedSquare || this.previewSquare"
        // So just calling syncHUD matches expected behavior.
        this.syncHUD();
    }

    getGridFromPointer(global) {
        // Map local coordinates relative to the grid
        const local = this.renderer.mapGrid.toLocal(global);

        const col = Math.floor(local.x / this.renderer.currentScale);
        const row = Math.floor(local.y / this.renderer.currentScale);

        if (
            col < 0 || col >= MapConstants.GRID_SIZE ||
            row < 0 || row >= MapConstants.GRID_SIZE
        ) return null;

        return { col, row };
    }

    getPopupAnchor(row, col) {
        const scale = this.renderer.currentScale;
        const x = this.renderer.mapContent.x + col * scale + scale / 2;
        const y = this.renderer.mapContent.y + row * scale + scale / 2;

        const viewportTop = 0;
        const minMargin = 60;
        const offset = 14;

        let anchorX = x;
        let anchorY = y - scale / 2 - offset;

        if (anchorY < viewportTop + minMargin) {
            anchorY = y + scale / 2 + offset;
        }

        // Horizontal clamping
        const leftMargin = 100;
        const rightMargin = this.renderer.maskWidth - 100;
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        anchorX = clamp(anchorX, leftMargin, rightMargin);

        return { x: anchorX, y: anchorY };
    }

    selectSquare(coords) {
        if (!coords) return;
        const { row, col } = coords;

        // Guard order
        if (this.state !== MapStates.SELECTING) return;
        if (this.selectedSquare?.row === row && this.selectedSquare?.col === col) return;
        if (this.ownship.row === row && this.ownship.col === col) return;

        this.selectedSquare = { row, col };
        this.handleHoverOut(); // clear hover

        // Default intent if none exists
        if (!this.intent) {
            this.intent = MapIntents.WAYPOINT;
        }

        const systemName = this.getSystemForIntent(this.intent);
        this.renderer.highlightSelection(row, col, systemName);
        this.renderer.emphasizeAxis(row, col);

        const anchor = this.getPopupAnchor(row, col);

        // Emit event: map:selectedSquare
        this.renderer.container.emit('map:selectedSquare', { row, col, anchor });

        this.handleActivity();
    }

    setIntent(intent) {
        if (!this.selectedSquare) return;
        this.intent = intent;

        // Refresh visuals
        const systemName = this.getSystemForIntent(intent);
        this.renderer.highlightSelection(this.selectedSquare.row, this.selectedSquare.col, systemName);

        this.renderer.container.emit('map:intentChanged', {
            intent,
            square: this.selectedSquare
        });
    }

    clearIntent() {
        this.intent = null;
    }

    getIntent() {
        return this.intent;
    }

    confirmIntent() {
        if (!this.selectedSquare || !this.intent) return;

        switch (this.intent) {
            case MapIntents.WAYPOINT:
                this.renderer.container.emit('map:confirmWaypoint', this.selectedSquare);
                break;
            case MapIntents.TORPEDO:
                this.renderer.container.emit('map:confirmTorpedoTarget', this.selectedSquare);
                break;
            case MapIntents.MARK:
                this.renderer.container.emit('map:addManualMark', this.selectedSquare);
                break;
        }
    }

    getSystemForIntent(intent) {
        switch (intent) {
            case MapIntents.TORPEDO:
                return 'weapons';
            case MapIntents.MARK:
                return 'reactor'; // Neutral/Grey
            case MapIntents.WAYPOINT:
            default:
                return 'detection';
        }
    }

    contextSelectSquare(coords) {
        if (!coords) return;
        const { row, col } = coords;

        // Ensure state is valid for selection
        if (this.state !== MapStates.SELECTING) return;

        // If not already selected, select it first to ensure highlight
        if (!this.selectedSquare || this.selectedSquare.row !== row || this.selectedSquare.col !== col) {
            this.selectSquare(coords);
        }

        // Verify selection succeeded
        if (this.selectedSquare?.row !== row || this.selectedSquare?.col !== col) return;

        const anchor = this.getPopupAnchor(row, col);
        this.renderer.container.emit('map:openContextMenu', {
            row,
            col,
            anchor,
            mode: 'intent'
        });
    }

    inspectSquare(coords) {
        if (!coords) return;
        console.log(`[MapController] Inspected square: ${coords.col}, ${coords.row}`);

        // HOOK: Visual Feedback Stack (Context/Inspect)
        this.renderer.container.emit('map_square_inspected', coords);

        // Server notification
        socketManager.socket.emit('map_inspect', coords);
    }

    clearSelection() {
        this.selectedSquare = null;
        this.intent = null;
        this.renderer.clearSelection();
        this.renderer.resetAxis();
        this.renderer.container.emit('map:selectionCleared');
        this.syncHUD();
    }

    syncHUD(cursor = null) {
        this.renderer.updateHUD({
            ownship: this.ownship,
            target: this.selectedSquare || this.previewSquare,
            cursor: cursor
        });
    }



    // Server-side interaction
    sendMove(direction) {
        console.log(`[MapController] Requesting move: ${direction}`);
        socketManager.move(direction);
    }

    chooseInitialPosition(row, col) {
        console.log(`[MapController] Choosing initial position: ${row}, ${col}`);
        socketManager.chooseInitialPosition(row, col);
    }
}

