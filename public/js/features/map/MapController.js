import * as PIXI from 'pixi.js';
import { MapConstants } from './mapConstants.js';
import { animateMapZoom } from './mapEffects.js';
import { socketManager } from '../../core/socketManager.js';
import { SystemColors } from '../../core/uiStyle.js';


export const MapStates = {
    IDLE: 'IDLE',
    HOVERED: 'HOVERED',
    SELECTED: 'SELECTED'
};


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

        this.state = MapStates.IDLE;
        this.hoveredSquare = null;
        this.selectedSquare = null;
        this.ownship = { row: 7, col: 7 }; // Default placeholder


        this.targetPos = new PIXI.Point(7, 7); // Default center

        this.zoomLevels = [90, 60, 30];

        this.init();
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
            this.ownship = { row: mySub.row, col: mySub.col };

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
        animateMapZoom(this.app, this.renderer, targetScale, MapConstants.ZOOM_ANIMATION_DURATION);
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

    centerOnPosition(pos = this.targetPos) {
        this.targetPos = pos;

        const centerX = this.renderer.maskWidth / 2 + MapConstants.LABEL_GUTTER;
        const centerY = this.renderer.maskHeight / 2 + MapConstants.LABEL_GUTTER;

        const mapX = pos.x * this.renderer.currentScale + this.renderer.currentScale / 2;
        const mapY = pos.y * this.renderer.currentScale + this.renderer.currentScale / 2;

        const targetX = centerX - mapX;
        const targetY = centerY - mapY;

        // Smooth transition
        const ease = 0.1;
        const centerTicker = () => {
            if (!this.renderer.container || this.renderer.container.destroyed) {
                this.app.ticker.remove(centerTicker);
                return;
            }

            const dx = targetX - this.renderer.mapContent.x;
            const dy = targetY - this.renderer.mapContent.y;

            if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                this.renderer.mapContent.x = targetX;
                this.renderer.mapContent.y = targetY;
                this.renderer.clampPosition();
                this.app.ticker.remove(centerTicker);
            } else {
                this.renderer.mapContent.x += dx * ease;
                this.renderer.mapContent.y += dy * ease;
                this.renderer.clampPosition();
            }
        };

        this.app.ticker.add(centerTicker);
    }

    // Square Selection
    setHoveredSquare(coords) {
        if (this.state === MapStates.SELECTED) return;

        if (!coords) {
            this.state = MapStates.IDLE;
            this.hoveredSquare = null;
            this.renderer.clearHover();
            return;
        }

        if (this.hoveredSquare?.row === coords.row && this.hoveredSquare?.col === coords.col) return;

        this.state = MapStates.HOVERED;
        this.hoveredSquare = coords;
        this.renderer.highlightHover(coords.row, coords.col);
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

    selectSquare(coords) {
        if (!coords) {
            this.state = MapStates.IDLE;
            this.selectedSquare = null;
            this.renderer.clearSelection();
            return;
        }

        this.state = MapStates.SELECTED;
        this.selectedSquare = coords;
        this.hoveredSquare = null;

        // Visual Update
        this.renderer.highlightSelection(coords.row, coords.col);
        this.renderer.emphasizeAxis(coords.row, coords.col);
        this.syncHUD();

        // If in start positions phase, clicking a square chooses initial position
        const state = socketManager.lastState;
        if (state && state.phase === 'INTERRUPT' && state.activeInterrupt?.type === 'START_POSITIONS') {
            // Validate: check if the square is WATER (0)
            if (state.board && state.board[coords.row] && state.board[coords.row][coords.col] === 0) {
                this.chooseInitialPosition(coords.row, coords.col);
            } else {
                console.log("[MapController] Cannot start on LAND.");
                return; // Ignore LAND
            }
        }


        // HOOK: Visual Feedback Stack (Selection)
        this.renderer.container.emit('map_square_selected', coords);

        // Server notification (general selection, e.g. for sonar/torpedo target selection later)
        socketManager.socket.emit('map_select', coords);
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
        this.state = MapStates.IDLE;
        this.selectedSquare = null;
        this.renderer.clearSelection();
        this.syncHUD();
    }

    syncHUD(cursor = null) {
        this.renderer.updateHUD({
            ownship: this.ownship,
            target: this.selectedSquare || this.hoveredSquare,
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

