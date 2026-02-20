import * as PIXI from 'pixi.js';
import { MapStates, MapConstants } from '../mapConstants.js';

/**
 * MapBehaviors
 * OOP Class for handling map input interactions like panning and zooming.
 */
export class MapBehaviors {
    constructor(mapViewArea, config = {}) {
        this.mapViewArea = mapViewArea;
        this.config = Object.assign({
            dragThresholdPx: MapConstants.DRAG_THRESHOLD_PX || 6,
            panSpeed: MapConstants.PAN_SPEED || 15,
        }, config);

        this.isDragging = false;
        this.isPotentialClick = false;
        this.dragStart = { x: 0, y: 0 };
        this.mapStart = { x: 0, y: 0 };

        // Bind methods
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this._init();
    }

    _init() {
        const grid = this.mapViewArea.mapGrid.container;
        if (!grid) {
            console.warn('[MapBehaviors] MapViewArea does not have a designated mapGrid. Interactive events may fail.');
            return;
        }

        console.log('[MapBehaviors] Binding pointer events to mapGrid');
        grid.on('pointerdown', this.onPointerDown);
        grid.on('globalpointermove', this.onPointerMove);
        grid.on('pointerup', this.onPointerUp);
        grid.on('pointerupoutside', this.onPointerUp);
        grid.on('pointerout', () => this.onPointerOut());

        // Keyboard and Wheel handling
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onWheel = this.onWheel.bind(this);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('wheel', this.onWheel, { passive: false });

        // Pan ticker for keyboard
        this.panTicker = () => this.handleKeyboardPan();
        this.mapViewArea.app.ticker.add(this.panTicker);
    }

    onPointerDown(e) {
        // Multi-touch pinch zoom detection (legacy style)
        const touches = e.getNativeEvent ? e.getNativeEvent().touches : e.nativeEvent?.touches;
        if (touches && touches.length >= 2) {
            this.isDragging = false;
            this.lastPinchDist = this.getPinchDist(touches);
            return;
        }

        // Ignore right clicks
        if (e.button === 2) return;

        this.isPotentialClick = true;
        this.isDragging = false;
        this.pressStartTime = performance.now();
        this.dragStart = { x: e.global.x, y: e.global.y };
        this.mapStart = {
            x: this.mapViewArea.mapContent.x,
            y: this.mapViewArea.mapContent.y
        };

        this.reportActivity();
    }

    getPinchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    onPointerMove(e) {
        // Multi-touch zoom
        const touches = e.getNativeEvent ? e.getNativeEvent().touches : e.nativeEvent?.touches;
        if (touches && touches.length >= 2) {
            const dist = this.getPinchDist(touches);
            const delta = dist - this.lastPinchDist;
            if (Math.abs(delta) > 5) {
                // Emit zoom event
                this.mapViewArea.container.emit('map:zoomRequested', { direction: delta > 0 ? 1 : -1 });
                this.lastPinchDist = dist;
            }
            return;
        }

        if (!this.dragStart) {
            // Hover logic when not dragging
            const coords = this.getGridCoords(e.global);
            if (coords) {
                this.mapViewArea.container.emit('map:hovered', coords);
            } else {
                this.mapViewArea.container.emit('map:hoveredOut');
            }
            return;
        }

        const dx = e.global.x - this.dragStart.x;
        const dy = e.global.y - this.dragStart.y;

        if (!this.isDragging && this.isPotentialClick) {
            if (Math.hypot(dx, dy) > this.config.dragThresholdPx) {
                this.isDragging = true;
                this.isPotentialClick = false;
                
                if (this.mapViewArea.mapGrid.container) {
                    this.mapViewArea.mapGrid.container.cursor = 'grabbing';
                }

                this.mapViewArea.setState(MapStates.PAN);
                this.mapViewArea.container.emit('map:hoveredOut');
            }
        }

        if (this.isDragging) {
            this.mapViewArea.mapContent.x = this.mapStart.x + dx;
            this.mapViewArea.mapContent.y = this.mapStart.y + dy;
            this.mapViewArea.clampPosition();
            
            if (this.mapViewArea.mapLabels) {
                this.mapViewArea.mapLabels.syncPosition(
                    this.mapViewArea.mapContent.x,
                    this.mapViewArea.mapContent.y
                );
            }
        } else {
            this.reportActivity();
        }
    }

    onPointerUp(e) {
        if (this.isPotentialClick) {
            const duration = performance.now() - this.pressStartTime;
            if (duration <= 250) { // 250ms click threshold
                const coords = this.getGridCoords(e.global);
                if (coords) {
                    this.mapViewArea.container.emit('map:clicked', coords);
                }
            }
        }

        this.isDragging = false;
        this.isPotentialClick = false;
        this.dragStart = null;
        
        if (this.mapViewArea.mapGrid.container) {
            this.mapViewArea.mapGrid.container.cursor = 'grab';
        }

        if (this.mapViewArea.currentState === MapStates.PAN) {
            this.mapViewArea.setState(MapStates.SELECTING);
        }

        this.reportActivity();
    }

    onPointerOut() {
        if (!this.isDragging) {
            this.mapViewArea.container.emit('map:hoveredOut');
        }
    }

    getGridCoords(global) {
        const local = this.mapViewArea.mapGrid.container.toLocal(global);
        const col = Math.floor(local.x / this.mapViewArea.config.tileSize);
        const row = Math.floor(local.y / this.mapViewArea.config.tileSize);

        if (col < 0 || col >= this.mapViewArea.config.gridSize ||
            row < 0 || row >= this.mapViewArea.config.gridSize) {
            return null;
        }
        return { row, col };
    }

    onKeyDown(e) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = true;
            e.preventDefault();
            this.reportActivity();
        } else if (e.code === 'Escape') {
            this.mapViewArea.container.emit('map:clearSelection');
        }
    }

    onKeyUp(e) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = false;
        }
    }

    onWheel(e) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        this.mapViewArea.container.emit('map:zoomRequested', { direction });
    }

    handleKeyboardPan() {
        if (!this.mapViewArea.container || this.mapViewArea.container.destroyed) return;

        let dx = 0;
        let dy = 0;
        const speed = this.config.panSpeed;

        if (this.keys.ArrowUp) dy += speed;
        if (this.keys.ArrowDown) dy -= speed;
        if (this.keys.ArrowLeft) dx += speed;
        if (this.keys.ArrowRight) dx -= speed;

        if (dx !== 0 || dy !== 0) {
            this.mapViewArea.mapContent.x += dx;
            this.mapViewArea.mapContent.y += dy;
            this.mapViewArea.clampPosition();
            
            if (this.mapViewArea.mapLabels) {
                this.mapViewArea.mapLabels.syncPosition(
                    this.mapViewArea.mapContent.x,
                    this.mapViewArea.mapContent.y
                );
            }
        }
    }

    reportActivity() {
        this.mapViewArea.container.emit('map:activity');
    }

    destroy() {
        const grid = this.mapViewArea.mapGrid.container;
        if (grid) {
            grid.off('pointerdown', this.onPointerDown);
            grid.off('globalpointermove', this.onPointerMove);
            grid.off('pointerup', this.onPointerUp);
            grid.off('pointerupoutside', this.onPointerUp);
        }

        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('wheel', this.onWheel);
        
        if (this.panTicker) {
            this.mapViewArea.app.ticker.remove(this.panTicker);
        }
    }
}
