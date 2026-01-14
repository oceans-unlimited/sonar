import * as PIXI from 'pixi.js';
import { Colors, Font } from '../../core/uiStyle.js';
import { MapUtils } from '../../utils/mapUtils.js';
import { MapConstants } from './mapConstants.js';

/**
 * Map HUD Renderer
 * Encapsulates the visual display of ownship and selection data on the map.
 */
export class MapHUDRenderer {
    constructor(mapRenderer) {
        this.renderer = mapRenderer;
        this.app = mapRenderer.app;

        this.container = new PIXI.Container();
        this.container.eventMode = 'none';

        this.ownshipGroup = new PIXI.Container();
        this.selectionGroup = new PIXI.Container();

        this.ownshipText = null;
        this.selectionText = null;

        this.init();
    }

    init() {
        const style = { fontFamily: Font.family, fontSize: 16 };
        const ownshipStyle = { ...style, fill: Colors.text, fontWeight: 'bold' };
        const selectionStyle = { ...style, fill: Colors.danger, fontWeight: 'bold' };

        // Left side: Ownship
        this.ownshipText = new PIXI.Text({ text: 'OWNSHIP: --\nSECTOR: --', style: ownshipStyle });
        this.ownshipGroup.addChild(this.ownshipText);
        this.container.addChild(this.ownshipGroup);

        // Right side: Selection
        this.selectionText = new PIXI.Text({ text: 'TARGET: --\nSECTOR: --\nRANGE: --', style: selectionStyle });
        this.selectionText.anchor.x = 1;
        this.selectionGroup.addChild(this.selectionText);
        this.container.addChild(this.selectionGroup);
    }

    update(data = {}, anchorPoint = 'bottom') {
        if (this.renderer.destroyed || this.renderer.app.destroyed) return;

        const { ownship, target } = data;

        // Update Text
        if (ownship && this.ownshipText) {
            const coord = MapUtils.toAlphaNumeric(ownship.row, ownship.col);
            const sector = MapUtils.getSector(ownship.row, ownship.col);
            this.ownshipText.text = `OWNSHIP: ${coord}\nSECTOR: ${sector}`;
        }

        if (this.selectionText) {
            if (target) {
                const coord = MapUtils.toAlphaNumeric(target.row, target.col);
                const sector = MapUtils.getSector(target.row, target.col);
                const range = MapUtils.getRange(ownship || { row: 0, col: 0 }, target);
                this.selectionText.text = `TARGET: ${coord}\nSECTOR: ${sector}\nRANGE: ${range}`;
            } else {
                this.selectionText.text = `TARGET: --\nSECTOR: --\nRANGE: --`;
            }
        }

        // Positioning Logic
        const padding = this.renderer.labelGutter + 10;
        const width = this.renderer.maskWidth;
        const height = this.renderer.maskHeight;

        this.ownshipGroup.x = padding;
        this.selectionGroup.x = width - padding + this.renderer.labelGutter;

        const topY = padding;
        const bottomY = height - this.container.height + this.renderer.labelGutter - 10;

        this.container.y = (anchorPoint === 'top') ? topY : bottomY;
        this.container.alpha = 1;
    }

    get visible() {
        return this.container.visible;
    }

    set visible(val) {
        this.container.visible = val;
    }
}
