import * as PIXI from "pixi.js";

/**
 * Engine Renderer (Skeleton)
 * Layout + composition only.
 * No state, no icons, no SVG math.
 */
export class EngineRenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;

        this.views = {
            root: null,
            main: null,
            rows: new Map() // direction -> row container
        };
    }

    render(parent) {
        const root = new PIXI.Container();
        this.views.root = root;
        parent.addChild(root);

        // Main area only (controls panel removed for now)
        const main = new PIXI.Container();
        this.views.main = main;
        root.addChild(main);

        this.renderRows(main);

        return {
            root,
            rows: this.views.rows
        };
    }

    renderRows(parent) {
        const directions = ['N', 'E', 'W', 'S'];

        const topMargin = 60;
        const availableHeight = this.app.screen.height - topMargin;
        const rowHeight = availableHeight / directions.length;

        directions.forEach((dir, i) => {
            const row = this.createRow(dir);

            row.y = topMargin + i * rowHeight;
            row.x = this.app.screen.width / 2;

            parent.addChild(row);
            this.views.rows.set(dir, row);
        });
    }

    createRow(direction) {
        const row = new PIXI.Container();

        //SVG-authored overlay
        const overlay = new PIXI.Sprite(this.assets.directionFrame);
        overlay.anchor.set(0, 0);
        overlay.x = 0;
        overlay.y = 0;
        row.addChild(overlay);

        // Debug outline (remove later)
        const debug = new PIXI.Graphics()
            .rect(0, 0, overlay.width, overlay.height)
            .stroke({ width: 1, color: 0xff0000 });
        row.addChild(debug);

        row.overlay = overlay;
        row.widthPx = overlay.width;
        row.heightPx = overlay.height;

        return row;
    }

    
}
