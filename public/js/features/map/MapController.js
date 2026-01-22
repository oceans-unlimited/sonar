import * as PIXI from 'pixi.js';
import { MapConstants, MapStates, MapIntents } from './mapConstants.js';
import { animateMapZoom, animateMapPosition, animateDetonation } from './mapEffects.js';
import { MapUtils } from '../../utils/mapUtils.js';
import { MapMenuRenderer } from './MapMenuRenderer.js';
import { socketManager } from '../../core/socketManager.js';
import { interruptManager } from '../interrupts/InterruptManager.js';
import { InterruptTypes } from '../interrupts/InterruptTypes.js';
import { Colors, SystemColors } from '../../core/uiStyle.js';


/**
 * Map Controller
 * Coordinates map state, renderer, and behaviors.
 * Stubbed/Mocked server interaction per user request.
 */
export class MapController {
    constructor(app, renderer, behaviors, assets) {
        this.app = app;
        this.renderer = renderer;
        this.behaviors = behaviors;
        this.assets = assets;

        this.state = MapStates.SELECTING; // Default state
        this.intent = MapIntents.WAYPOINT; // Default to WAYPOINT, persists between selections
        this.isCentered = true;

        this.previewSquare = null; // formerly hoveredSquare
        this.selectedSquare = null;
        this.ownship = { row: 7, col: 7, pastTrack: [], mines: [] }; // Default placeholder
        this.showOwnship = true; // Visibility preference
        this.terrain = null;

        // Intent-specific persistent data
        this.waypoints = { current: null }; // { current: {row, col} }
        this.targets = { torpedo: null }; // { torpedo: {row, col} }
        this.marks = []; // Array of {row, col}, max 5

        // Stored coordinates for persistent elements (for repositioning on zoom)
        this.storedWaypoint = null;
        this.storedTorpedoTarget = null;
        this.storedMarks = [];

        this.tracks = {
            ownship: { color: Colors.text, visible: true, maskCurrentPosition: true }
        };

        this.inactivityTimer = null;
        this.startInactivityTimer();


        this.targetPos = new PIXI.Point(7, 7); // Default center

        this.zoomLevels = [90, 60, 30];

        // Initialize menu renderer
        this.menuRenderer = new MapMenuRenderer(renderer, assets);

        this.viewConfig = { ...this.renderer.viewConfig };

        // Handle external damage animation locks
        this._onDamageAnimating = ({ active }) => {
            if (active) {
                this.setState(MapStates.ANIMATING);
            } else if (this.state === MapStates.ANIMATING) {
                this.setState(MapStates.SELECTING);
            }
        };

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
            // Only clear selection, keep intent persistent
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
        this.app.stage.on('damage:animating', this._onDamageAnimating);

        // Store references for cleanup
        this._stateUpdateHandler = (state) => this.handleStateUpdate(state);
        this._interruptHandler = (event, interrupt) => {
            if (event === 'interruptStarted') {
                if (interrupt.type === InterruptTypes.TORPEDO_RESOLUTION) {
                    this.handleDetonationInterrupt(interrupt.payload);
                } else if (interrupt.payload?.enemySubId || interrupt.payload?.sectorId) {
                    // Hook for drone/sonar/enemy feedback
                    this.handleEnemyDetection(interrupt.payload);
                }
            }
        };

        // Listen for state updates from the socket
        socketManager.on('stateUpdate', this._stateUpdateHandler);

        // Handle immediate initialization if state is already available
        if (socketManager.lastState) {
            this.handleStateUpdate(socketManager.lastState);
        }

        // Listen for menu selections
        this.renderer.container.on('map:menuSelected', (data) => this.handleMenuSelection(data));

        // Listen for interrupts
        interruptManager.subscribe(this._interruptHandler);

        this.renderer.renderMap();
        this.renderer.clampPosition();
    }

    destroy() {
        this.app.stage.off('damage:animating', this._onDamageAnimating);

        if (this._stateUpdateHandler) {
            socketManager.off('stateUpdate', this._stateUpdateHandler);
        }
        if (this._interruptHandler) {
            interruptManager.unsubscribe(this._interruptHandler);
        }
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
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
            // Track previous position to detect movement
            const previousRow = this.ownship.row;
            const previousCol = this.ownship.col;

            // Update Ownship State with Server Data Model
            this.ownship = {
                row: mySub.row,
                col: mySub.col,
                pastTrack: mySub.past_track || [], // snake_case from server
                mines: mySub.mines || [],
                state: mySub.submarineState
            };

            // Re-center map on ownship if position has changed
            if (previousRow !== this.ownship.row || previousCol !== this.ownship.col) {
                const newCenter = new PIXI.Point(this.ownship.col, this.ownship.row);
                // Force re-center even if animating (e.g. after a detonation)
                this.centerOnPosition(newCenter, null, false, true);
                console.log(`[MapController] Re-centering on ownship at (${this.ownship.row}, ${this.ownship.col})`);
            }

            // Tint if in START_POSITIONS
            const isStartPositions = state.phase === 'INTERRUPT' && state.activeInterrupt?.type === 'START_POSITIONS';
            const hasChosen = state.gameStateData?.choosingStartPositions?.submarineIdsWithStartPositionChosen?.includes(mySub.id);

            if (isStartPositions) {
                if (hasChosen) {
                    this.renderer.updateOwnship(this.ownship.row, this.ownship.col, SystemColors.detection, true);
                } else {
                    this.renderer.updateOwnship(this.ownship.row, this.ownship.col, Colors.text, false);
                }
            } else {
                this.renderer.updateOwnship(this.ownship.row, this.ownship.col, Colors.text, this.showOwnship);
            }

            // Update past track visualization
            // Programmatic masking: hide track node at ownship grid square when sprite is visible
            const maskCurrentPosition = this.renderer.ownshipSprite?.visible || false;

            // Sync current masking state to track config
            this.tracks.ownship.maskCurrentPosition = maskCurrentPosition;

            this.renderer.updateTrack('ownship', this.ownship.pastTrack, {
                ...this.tracks.ownship
            });

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

        // Update persistent element positions after resize
        this.updatePersistentElementPositions();
    }

    setZoom(targetScale) {
        if (this.state === MapStates.ANIMATING) return; // Lock during animation
        this.setState(MapStates.ANIMATING);
        this.isCentered = false;

        // Hide overlays during zoom, but store original visibility
        const trackWasVisible = this.renderer.trackLayer.visible;
        const hoverWasVisible = this.renderer.hoverLayer.visible;

        this.renderer.trackLayer.visible = false;
        this.renderer.hoverLayer.visible = false;

        animateMapZoom(this.app, this.renderer, targetScale, MapConstants.ZOOM_ANIMATION_DURATION, () => {
            // Restore overlays to their previous visibility state
            this.renderer.trackLayer.visible = trackWasVisible;
            this.renderer.hoverLayer.visible = hoverWasVisible;

            this.setState(MapStates.SELECTING);
            // Update persistent element positions after zoom
            this.updatePersistentElementPositions();
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
        // If inactive in SELECTING, re-center on ownship
        if (this.state === MapStates.SELECTING) {
            console.log('[MapController] Inactivity triggered, returning to ownship');
            const ownshipPos = new PIXI.Point(this.ownship.col, this.ownship.row);
            this.centerOnPosition(ownshipPos);
        }
    }

    // Waypoint Logic (Intent Validation)
    validateWaypoint(coords) {
        // Validation Stub
        // TODO: Check against server board data (water vs land), Max range, etc.
        // For now, allow simple bounds check (handled by getGridFromPointer)
        return true;
    }

    /**
     * Centers the map on a specific grid position with a smooth animation
     * @param {object} pos - {x, y} grid coordinates
     * @param {function} onComplete - Callback after animation finishes
     * @param {boolean} keepAnimating - If true, stays in ANIMATING state (for sequences)
     * @param {boolean} force - If true, allows triggering even if currently animating
     */
    centerOnPosition(pos = this.targetPos, onComplete = null, keepAnimating = false, force = false) {
        this.targetPos = pos;

        const centerX = this.renderer.maskWidth / 2 + MapConstants.LABEL_GUTTER;
        const centerY = this.renderer.maskHeight / 2 + MapConstants.LABEL_GUTTER;

        const mapX = pos.x * this.renderer.currentScale + this.renderer.currentScale / 2;
        const mapY = pos.y * this.renderer.currentScale + this.renderer.currentScale / 2;

        const targetX = centerX - mapX;
        const targetY = centerY - mapY;

        // Smooth transition via mapEffects
        if (this.state === MapStates.ANIMATING && !onComplete && !force) return; // Allow if part of a sequence
        this.setState(MapStates.ANIMATING);

        animateMapPosition(this.app, this.renderer, targetX, targetY, 400, () => {
            this.isCentered = true;
            if (!keepAnimating) {
                this.setState(MapStates.SELECTING);
            }
            if (onComplete) onComplete();
        });
    }

    /**
     * Handles detonation animation sequence
     * @param {object} payload - { row, col }
     */
    handleDetonationInterrupt(payload) {
        if (!payload || payload.row === undefined || payload.col === undefined) return;

        const { row, col } = payload;
        console.log(`%c[MapController]%c Detonation triggered at ${row}, ${col}`, 'color: #ff0000; font-weight: bold;', '');

        // 1. Lock state & Hide overlays
        this.setState(MapStates.ANIMATING);
        const hudWasVisible = this.renderer.hud.visible;
        const trackWasVisible = this.renderer.trackLayer.visible;

        this.renderer.hud.visible = false;
        this.renderer.trackLayer.visible = false;

        // 2. Pan to target
        const targetPos = new PIXI.Point(col, row);
        this.centerOnPosition(targetPos, () => {
            // 3. Detonate
            animateDetonation(this.app, this.renderer, row, col, () => {
                // 4. Unlock state & Restore overlays
                this.renderer.hud.visible = hudWasVisible;
                this.renderer.trackLayer.visible = trackWasVisible;

                this.setState(MapStates.SELECTING);
                this.isCentered = false; // Ensure inactivity timer kicks in
                this.handleActivity();
            });
        }, true); // keepAnimating = true
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
        this.syncHUD(coords);
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

    selectSquare(coords, squareData = null) {
        if (!coords) return;
        const { row, col } = coords;

        // Guard order
        if (this.state !== MapStates.SELECTING) return;
        if (this.selectedSquare?.row === row && this.selectedSquare?.col === col) return;

        this.selectedSquare = { row, col };
        this.handleHoverOut(); // clear hover

        // Ensure we have a default intent
        if (!this.intent) {
            this.intent = MapIntents.WAYPOINT;
        }

        // Get square data for menu decisions (use provided or get fresh)
        const finalSquareData = squareData || MapUtils.getSquareData(coords, this.ownship, this.terrain, this.waypoints, this.targets);

        const systemName = this.getSystemForIntent(this.intent);

        // Enter ANIMATING state to block input during flash
        this.setState(MapStates.ANIMATING);

        this.renderer.highlightSelection(row, col, systemName, () => {
            if (this.state === MapStates.ANIMATING) {
                this.setState(MapStates.SELECTING);
            }
        });

        this.renderer.emphasizeAxis(row, col);

        const anchor = this.getPopupAnchor(row, col);

        // Emit event: map:selectedSquare with square data
        this.renderer.container.emit('map:selectedSquare', { row, col, anchor, squareData: finalSquareData });

        // Show intent menu for WAYPOINT intent
        if (this.intent === MapIntents.WAYPOINT) {
            this.menuRenderer.showIntentMenu(anchor, finalSquareData, { currentIntent: this.intent });
        } else if (this.intent === MapIntents.SECTOR_SELECT) {
            const sectorId = MapUtils.getSector(row, col);
            console.log(`[MapController] Sector selected: ${sectorId}`);

            // Highlight whole sector
            this.renderer.highlightSector(sectorId);

            this.renderer.container.emit('map:sectorSelected', {
                sectorId,
                coords: { row, col }
            });
        }

        this.handleActivity();
    }

    /**
     * Set the current view configuration
     * @param {object} config - Partial viewConfig
     */
    setViewConfig(config) {
        this.viewConfig = { ...this.viewConfig, ...config };
        this.renderer.viewConfig = this.viewConfig;
        this.renderer.renderMap();
    }

    /**
     * Handles enemy detection feedback (Drone/Sonar)
     * @param {object} payload - { sectorId, row, col, type }
     */
    handleEnemyDetection(payload) {
        const { sectorId, row, col, type } = payload;

        if (sectorId) {
            this.renderer.highlightSector(sectorId, SystemColors.weapons);
        } else if (row !== undefined && col !== undefined) {
            this.renderer.highlightSelection(row, col, 'weapons');
        }
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

    /**
     * Handles menu selection events
     * @param {object} data - Menu selection data
     */
    handleMenuSelection(data) {
        const { menuType, option, squareData } = data;

        if (menuType === 'context') {
            // Context menu changes intent
            this.setIntent(option.intent);
        } else if (menuType === 'intent') {
            // Intent menu performs action
            if (option.action === 'cancel') {
                // Cancel waypoint
                this.clearWaypoint();
            } else {
                // Set waypoint
                this.setWaypoint(squareData.coords);
            }
        }
    }

    /**
     * Sets a waypoint at the given coordinates
     * @param {object} coords - {row, col}
     */
    setWaypoint(coords) {
        this.waypoints.current = coords;
        this.storedWaypoint = coords;
        this.renderer.updateWaypoint(coords);
        console.log(`[MapController] Waypoint set at ${coords.row}, ${coords.col}`);
    }

    /**
     * Clears the current waypoint
     */
    clearWaypoint() {
        this.waypoints.current = null;
        this.storedWaypoint = null;
        this.renderer.clearWaypoint();
        console.log(`[MapController] Waypoint cleared`);
    }

    /**
     * Sets a torpedo target
     * @param {object} coords - {row, col}
     */
    setTorpedoTarget(coords) {
        this.targets.torpedo = coords;
        this.storedTorpedoTarget = coords;
        this.renderer.updateTorpedoTarget(coords);
        console.log(`[MapController] Torpedo target set at ${coords.row}, ${coords.col}`);
    }

    /**
     * Clears torpedo target
     */
    clearTorpedoTarget() {
        this.targets.torpedo = null;
        this.storedTorpedoTarget = null;
        this.renderer.clearTorpedoTarget();
        console.log(`[MapController] Torpedo target cleared`);
    }

    /**
     * Adds a mark at the given coordinates
     * @param {object} coords - {row, col}
     */
    addMark(coords) {
        // Limit to 5 marks, remove oldest if needed
        if (this.marks.length >= 5) {
            this.marks.shift();
            this.storedMarks.shift();
        }
        this.marks.push(coords);
        this.storedMarks.push(coords);
        this.renderer.updateMarks(this.marks);
        console.log(`[MapController] Mark added at ${coords.row}, ${coords.col}`);
    }

    /**
     * Updates positions of persistent elements when map scales/zooms
     */
    updatePersistentElementPositions() {
        if (this.storedWaypoint) {
            this.renderer.updateWaypoint(this.storedWaypoint);
        }
        if (this.storedTorpedoTarget) {
            this.renderer.updateTorpedoTarget(this.storedTorpedoTarget);
        }
        if (this.storedMarks.length > 0) {
            this.renderer.updateMarks(this.storedMarks);
        }

        // Call renderer's internal update to handle tracks and other renderer-managed elements
        this.renderer.updatePersistentElementPositions();
    }

    /**
     * Gets current square data for menu decisions
     * @param {object} coords - {row, col}
     * @returns {object} Square data
     */
    getSquareData(coords) {
        return MapUtils.getSquareData(coords, this.ownship, this.terrain, this.waypoints, this.targets);
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

        // Select the square without showing the intent menu
        this.selectedSquare = { row, col };
        this.handleHoverOut(); // clear hover

        // Update highlight with current intent color
        const systemName = this.getSystemForIntent(this.intent);
        this.renderer.highlightSelection(row, col, systemName);

        this.renderer.emphasizeAxis(row, col);

        // Get square data and show context menu
        const contextSquareData = MapUtils.getSquareData(coords, this.ownship, this.terrain, this.waypoints, this.targets);
        const anchor = this.getPopupAnchor(row, col);

        this.renderer.container.emit('map:openContextMenu', {
            row,
            col,
            anchor,
            squareData: contextSquareData,
            mode: 'context'
        });

        // Show context menu (for intent switching) - this replaces the intent menu
        this.menuRenderer.showContextMenu(anchor, contextSquareData, { currentIntent: this.intent });

        this.handleActivity();
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
        // Keep intent persistent - don't clear it here
        this.renderer.clearSelection();
        this.renderer.resetAxis();
        this.menuRenderer.hide(); // Hide any open menus
        this.renderer.container.emit('map:selectionCleared');
        this.syncHUD();
    }

    syncHUD(cursorOverride = null) {
        // Respect viewConfig toggle
        if (this.viewConfig.showHUD === false) {
            this.renderer.hud.visible = false;
            return;
        }

        // Auto-show HUD if in interactive states
        if (this.state === MapStates.SELECTING || this.state === MapStates.PAN) {
            this.renderer.hud.visible = true;
        }

        const target = cursorOverride || this.selectedSquare || this.previewSquare;

        // Priority 1: Use focal point (Selection/Cursor)
        // Priority 2: Fallback to Ownship
        const focalRow = target ? target.row : this.ownship.row;
        const anchorPoint = this.getHUDAnchorPoint(focalRow);

        this.renderer.updateHUD({
            ownship: this.ownship,
            target: target
        }, anchorPoint);
    }

    /**
     * Calculates the optimal HUD anchor point to avoid obscuring a specific row.
     * @param {number} focalRow - Grid row to avoid
     * @returns {string} 'top' or 'bottom'
     */
    getHUDAnchorPoint(focalRow) {
        const viewportY = focalRow * this.renderer.currentScale + this.renderer.mapContent.y;
        const threshold = this.renderer.maskHeight / 2;
        return (viewportY < threshold) ? 'bottom' : 'top';
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

    /**
     * Sets the visibility of the entire track layer
     * @param {boolean} visible - Whether the track layer should be visible
     */
    setTrackLayerVisibility(visible) {
        this.renderer.setTrackLayerVisibility(visible);
    }

    /**
     * Sets the color of a specific track
     * @param {string} trackId - Track identifier
     * @param {number} color - Hex color
     */
    setTrackColor(trackId, color) {
        if (!this.tracks[trackId]) {
            this.tracks[trackId] = { color, visible: true, maskCurrentPosition: false };
        } else {
            this.tracks[trackId].color = color;
        }

        // Re-render if track exists
        const track = this.renderer.trackGraphics[trackId];
        if (track) {
            this.renderer.updateTrack(trackId, track.positions, this.tracks[trackId]);
        }
    }

    /**
     * Sets the visibility of a specific track
     * @param {string} trackId - Track identifier
     * @param {boolean} visible - Whether the track should be visible
     */
    setTrackVisibility(trackId, visible) {
        if (this.tracks[trackId]) {
            this.tracks[trackId].visible = visible;
            const track = this.renderer.trackGraphics[trackId];
            if (track) {
                track.container.visible = visible;
            }
        }
    }
}

