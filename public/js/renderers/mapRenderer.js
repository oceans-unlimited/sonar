import * as PIXI from 'pixi.js';

export class MapRenderer {
    constructor(app, assets, config = {}) {
        this.app = app;
        this.assets = assets;
        this.config = {
            gridSize: 15,
            tileSize: 90, // Default scale
            margin: 20,
            ...config
        };

        // this.container will now be the static Viewport
        this.container = new PIXI.Container();

        // this.mapContent will be the moving part
        this.mapContent = new PIXI.Container();
        this.container.addChild(this.mapContent);

        this.mapGrid = new PIXI.Container();
        this.decorationGrid = new PIXI.Container();

        this.mapContent.addChild(this.mapGrid);
        this.mapContent.addChild(this.decorationGrid);

        // Labels containers (static viewport children)
        this.horizontalLabels = new PIXI.Container();
        this.verticalLabels = new PIXI.Container();
        this.container.addChild(this.horizontalLabels, this.verticalLabels);

        this.mask = new PIXI.Graphics();
        this.container.addChild(this.mask);
        this.mapContent.mask = this.mask;

        // Mask for labels (to keep them in their gutters)
        this.labelGutter = 30; // space for labels
        this.hLabelMask = new PIXI.Graphics();
        this.vLabelMask = new PIXI.Graphics();
        this.horizontalLabels.mask = this.hLabelMask;
        this.verticalLabels.mask = this.vLabelMask;
        this.container.addChild(this.hLabelMask, this.vLabelMask);

        this.currentScale = 90;
        this.dragging = false;
        this.dragStart = new PIXI.Point();
        this.dragStartPos = new PIXI.Point();
        this.targetPos = new PIXI.Point(0, 0);

        this.initTextures();
        this.renderMap();
        this.setupInteractions();
        this.setupKeyboardControls();

        // Sync labels with mapContent
        this.app.ticker.add(() => {
            if (this.container.destroyed) return;
            this.horizontalLabels.x = this.mapContent.x;
            this.verticalLabels.y = this.mapContent.y;
        });
    }

    initTextures() {
        /*
        const TILE_SIZE = 32; // Source tile size
        this.backgroundTextures = [
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(0, 0, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE * 2, 0, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(0, TILE_SIZE, TILE_SIZE, TILE_SIZE) }),
        ];

        this.foregroundTextures = [
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE * 2, TILE_SIZE, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(0, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(TILE_SIZE, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE) }),
            new PIXI.Texture({ source: this.assets.map_sprites.source, frame: new PIXI.Rectangle(0, TILE_SIZE * 3, TILE_SIZE, TILE_SIZE) }),
        ];
        */
    }

    renderMap() {
        this.mapGrid.removeChildren();
        this.decorationGrid.removeChildren();
        this.horizontalLabels.removeChildren();
        this.verticalLabels.removeChildren();

        const { gridSize } = this.config;

        // Simple grid rendering for now
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const tile = new PIXI.Graphics()
                    .rect(0, 0, this.currentScale, this.currentScale)
                    .fill({ color: 0x003300, alpha: 0.3 })
                    .stroke({ width: 1, color: 0x005500 });

                tile.x = col * this.currentScale;
                tile.y = row * this.currentScale;
                this.mapGrid.addChild(tile);
            }
        }

        // Render Coordinate Labels (A-O, 1-15)
        const labelStyle = {
            fontFamily: 'Goldman', // Requested font
            fontSize: Math.max(12, this.currentScale / 4),
            fill: 0x00ff00,
            dropShadow: { blur: 2, color: 0x000000, distance: 1 }
        };

        for (let i = 0; i < gridSize; i++) {
            // Horizontal (A, B, C...)
            const hText = new PIXI.Text({
                text: String.fromCharCode(65 + i),
                style: labelStyle
            });
            hText.anchor.set(0.5);
            hText.x = i * this.currentScale + this.currentScale / 2;
            hText.y = this.labelGutter / 2;
            this.horizontalLabels.addChild(hText);

            // Vertical (1, 2, 3...)
            const vText = new PIXI.Text({
                text: (i + 1).toString(),
                style: labelStyle
            });
            vText.anchor.set(0.5);
            vText.x = this.labelGutter / 2;
            vText.y = i * this.currentScale + this.currentScale / 2;
            this.verticalLabels.addChild(vText);
        }
    }

    setScale(scale) {
        if ([30, 60, 90].includes(scale)) {
            this.currentScale = scale;
            this.renderMap();
            this.clampPosition();
        }
    }

    setMask(x, y, width, height) {
        this.mask.clear()
            .rect(x + this.labelGutter, y + this.labelGutter, width - this.labelGutter, height - this.labelGutter)
            .fill(0xffffff);

        // Also update labels masks
        this.hLabelMask.clear()
            .rect(x + this.labelGutter, y, width - this.labelGutter, this.labelGutter)
            .fill(0xffffff);
        this.vLabelMask.clear()
            .rect(x, y + this.labelGutter, this.labelGutter, height - this.labelGutter)
            .fill(0xffffff);

        this.maskWidth = width - this.labelGutter;
        this.maskHeight = height - this.labelGutter;

        // Adjust mapContent offset to account for gutters
        this.mapContent.x = x + this.labelGutter;
        this.mapContent.y = y + this.labelGutter;
        this.horizontalLabels.y = y;
        this.verticalLabels.x = x;

        // Ensure interactions work over the entire visible area
        this.container.hitArea = new PIXI.Rectangle(x, y, width, height);
    }

    setupInteractions() {
        this.container.eventMode = 'static';
        this.container.cursor = 'grab';
        this.container.on('pointerdown', this.onDragStart, this);
        this.container.on('pointerup', this.onDragEnd, this);
        this.container.on('pointerupoutside', this.onDragEnd, this);
        this.container.on('pointermove', this.onDragMove, this);
    }

    setupKeyboardControls() {
        const keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        const onKeyDown = (e) => {
            if (keys.hasOwnProperty(e.code)) {
                keys[e.code] = true;
                e.preventDefault();
                this.stopInactivityTimer();
                if (this.onStartDrag) this.onStartDrag(); // reuse drag trigger for UI interaction
            }
        };

        const onKeyUp = (e) => {
            if (keys.hasOwnProperty(e.code)) {
                keys[e.code] = false;
                if (!Object.values(keys).some(k => k)) {
                    this.startInactivityTimer();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Cleanup listener on destroy
        this.container.on('destroyed', () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        });

        // Key movement loop
        const speed = 15;
        this.app.ticker.add(() => {
            if (!this.container || this.container.destroyed) return;

            let dx = 0;
            let dy = 0;
            if (keys.ArrowUp) dy += speed;
            if (keys.ArrowDown) dy -= speed;
            if (keys.ArrowLeft) dx += speed;
            if (keys.ArrowRight) dx -= speed;

            if (dx !== 0 || dy !== 0) {
                this.mapContent.x += dx;
                this.mapContent.y += dy;
                this.clampPosition();
            }
        });
    }

    stopInactivityTimer() {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    }

    startInactivityTimer() {
        this.stopInactivityTimer();
        this.inactivityTimer = setTimeout(() => {
            this.centerOnPosition();
            if (this.onInactivity) this.onInactivity();
        }, 2000);
    }

    onDragStart(event) {
        this.dragging = true;
        this.stopInactivityTimer();
        this.container.cursor = 'grabbing';
        this.dragStart.copyFrom(event.global);
        this.dragStartPos.copyFrom(this.mapContent.position);
        if (this.onStartDrag) this.onStartDrag();
    }

    onDragEnd() {
        if (this.dragging) {
            this.dragging = false;
            this.container.cursor = 'grab';
            this.startInactivityTimer();
        }
    }

    onDragMove(event) {
        if (this.dragging) {
            const newPos = event.global;
            const dx = newPos.x - this.dragStart.x;
            const dy = newPos.y - this.dragStart.y;

            this.mapContent.x = this.dragStartPos.x + dx;
            this.mapContent.y = this.dragStartPos.y + dy;

            this.clampPosition();
        }
    }

    clampPosition() {
        const MAP_WIDTH = this.config.gridSize * this.currentScale;
        const MAP_HEIGHT = this.config.gridSize * this.currentScale;

        // Account for gutter in limits
        // Inner coordinates relative to (gutter, gutter)
        const minX = Math.min(this.labelGutter, this.maskWidth + this.labelGutter - MAP_WIDTH);
        const maxX = this.labelGutter;
        const minY = Math.min(this.labelGutter, this.maskHeight + this.labelGutter - MAP_HEIGHT);
        const maxY = this.labelGutter;

        this.mapContent.x = Math.max(minX, Math.min(maxX, this.mapContent.x));
        this.mapContent.y = Math.max(minY, Math.min(maxY, this.mapContent.y));
    }

    centerOnPosition(pos = this.targetPos) {
        this.targetPos = pos;

        const centerX = this.maskWidth / 2 + this.labelGutter;
        const centerY = this.maskHeight / 2 + this.labelGutter;

        const mapX = pos.x * this.currentScale + this.currentScale / 2;
        const mapY = pos.y * this.currentScale + this.currentScale / 2;

        const targetX = centerX - mapX;
        const targetY = centerY - mapY;

        // Smooth transition using ticker
        const ease = 0.1;
        const centerTicker = () => {
            if (this.dragging || !this.container || this.container.destroyed) {
                this.app.ticker.remove(centerTicker);
                return;
            }

            const dx = targetX - this.mapContent.x;
            const dy = targetY - this.mapContent.y;

            if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                this.mapContent.x = targetX;
                this.mapContent.y = targetY;
                this.clampPosition();
                this.app.ticker.remove(centerTicker);
            } else {
                this.mapContent.x += dx * ease;
                this.mapContent.y += dy * ease;
                this.clampPosition();
            }
        };

        this.app.ticker.add(centerTicker);
    }
}
