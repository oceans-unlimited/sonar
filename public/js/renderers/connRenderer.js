import * as PIXI from "pixi.js";
import { Colors, Font, SystemColors } from "../core/uiStyle.js";
import { renderControlPanel } from "./panelRenderer.js";
import { applyTintColor, applyGlowEffect } from "../ui/effects/glowEffect.js";

/**
 * Conn Renderer
 * Handles visual construction of the Captain's (Conn) scene.
 * Includes Map View Area and Helm Controls.
 */
export class ConnRenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;
        this.views = {
            mapContainer: null,
            controlsPanel: null,
            helmButtons: new Map(),
            systemRows: new Map(),
            root: null
        };

    }

    render(parent) {
        this.scene = parent;
        const root = new PIXI.Container();
        this.views.root = root;
        parent.addChild(root);

        const IS_MOBILE = this.app.screen.width < 800;
        const CONTROLS_WIDTH = IS_MOBILE ? 270 : 300;
        this.BUTTON_SCALE = IS_MOBILE ? 0.8 : 0.5;

        // 1. Map View Window
        this.views.mapContainer = new PIXI.Container();
        root.addChild(this.views.mapContainer);

        // 2. Controls Panel
        this.views.controlsPanel = renderControlPanel(this.app, this.assets, {
            name: "",
            width: CONTROLS_WIDTH,
            height: this.app.screen.height,
            showOverlays: true // We'll add custom noise later if needed
        });
        root.addChild(this.views.controlsPanel);

        // 3. Header Info
        this.renderHeader(this.views.controlsPanel, CONTROLS_WIDTH);

        // 4. Helm Controls
        const buttonsContainer = new PIXI.Container();
        buttonsContainer.x = 20;
        buttonsContainer.y = 120;
        this.views.controlsPanel.addChild(buttonsContainer);

        this.renderHelm(buttonsContainer, CONTROLS_WIDTH);

        // 5. System Rows
        this.renderSystemRows(buttonsContainer, CONTROLS_WIDTH);

        return {

            root,
            mapContainer: this.views.mapContainer,
            controlsPanel: this.views.controlsPanel,
            helmButtons: this.views.helmButtons,
            systemRows: this.views.systemRows
        };

    }

    renderHeader(parent, width) {
        const header = new PIXI.Container();
        header.x = 0;
        header.y = 10;
        parent.addChild(header);

        const subProfile = new PIXI.Sprite(this.assets.sub_profileA);
        subProfile.scale.set(0.6);
        subProfile.x = 10;
        header.addChild(subProfile);

        const subLabel = new PIXI.Text({
            text: 'USS OKLAHOMA',
            style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
        });
        subLabel.x = 10;
        subLabel.y = 37;
        header.addChild(subLabel);

        const cptBadge = new PIXI.Sprite(this.assets.captain_badge);
        cptBadge.anchor.set(1, 0);
        cptBadge.x = width - 10;
        header.addChild(cptBadge);

        const cptLabel = new PIXI.Text({
            text: 'COMMANDER',
            style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
        });
        cptLabel.anchor.set(1, 0);
        cptLabel.x = width - 10;
        cptLabel.y = 37;
        header.addChild(cptLabel);
    }

    renderHelm(parent, width) {
        const helm = new PIXI.Container();
        helm.y = 0;
        parent.addChild(helm);

        const BUTTON_SIZE = this.assets.button.width * this.BUTTON_SCALE;
        const dpadSpacingX = BUTTON_SIZE + 10;
        const dpadSpacingY = this.assets.button.height * this.BUTTON_SCALE;
        const helmWidth = dpadSpacingX * 3;
        const helmStartX = width - helmWidth + 10;

        const directions = [
            { label: 'N', x: dpadSpacingX, y: 0, rot: -Math.PI / 2 },
            { label: 'W', x: 0, y: dpadSpacingY, rot: Math.PI },
            { label: 'E', x: dpadSpacingX * 2, y: dpadSpacingY, rot: 0 },
            { label: 'S', x: dpadSpacingX, y: dpadSpacingY * 2, rot: Math.PI / 2 }
        ];

        directions.forEach(dir => {
            const btn = new PIXI.Container();
            btn.x = helmStartX + dir.x;
            btn.y = dir.y;

            const bg = new PIXI.Sprite(this.assets.button);
            bg.anchor.set(0.5);
            bg.scale.set(this.BUTTON_SCALE);
            applyTintColor(bg, Colors.border);

            const arrow = new PIXI.Sprite(this.assets.arrow);
            arrow.anchor.set(0.5);
            arrow.scale.set(this.BUTTON_SCALE * 1.6);
            arrow.rotation = dir.rot;
            applyTintColor(arrow, Colors.text);

            const t = new PIXI.Text({
                text: dir.label,
                style: { fontFamily: 'Goldman', fontSize: 20, fill: Colors.text }
            });
            t.anchor.set(0.5);

            if (dir.label === 'E') { t.x = -12; arrow.x = 12; }
            else { arrow.x = -12; t.x = 12; }

            btn.addChild(bg, arrow, t);
            btn.eventMode = 'static';
            btn.cursor = 'pointer';
            helm.addChild(btn);

            this.views.helmButtons.set(dir.label, btn);
        });
    }

    renderSystemRows(parent, width) {
        const helmOffset = 150;
        const rowWidth = width - 40;

        const torpedoRow = this.createControlRow('TORPEDO', this.assets.torpedo_sys, [SystemColors.weapons, SystemColors.weapons, SystemColors.weapons], rowWidth);
        torpedoRow.y = helmOffset;
        parent.addChild(torpedoRow);
        this.views.systemRows.set('torpedo', torpedoRow);

        const mineRow = this.createControlRow('MINE', this.assets.mine_sys, [SystemColors.weapons, SystemColors.weapons, SystemColors.weapons], rowWidth);
        mineRow.y = helmOffset + 80;
        parent.addChild(mineRow);
        this.views.systemRows.set('mine', mineRow);

        const vesselRow = this.createControlRow('VESSEL', this.assets.stealth_sys, [SystemColors.stealth, Colors.text, Colors.text], rowWidth, [this.assets.pause]);
        vesselRow.y = helmOffset + 160;
        parent.addChild(vesselRow);
        this.views.systemRows.set('vessel', vesselRow);
    }

    createControlRow(label, iconTexture, colors, width, buttonTextures = []) {
        const row = new PIXI.Container();
        const mainColor = colors[0];

        const labelTxt = new PIXI.Text({
            text: label.toUpperCase(),
            style: { fontFamily: Font.family, fontSize: 13, fill: mainColor }
        });
        row.addChild(labelTxt);

        const line = new PIXI.Graphics()
            .rect(0, labelTxt.height + 2, width, 1)
            .fill({ color: mainColor, alpha: 0.5 });
        row.addChild(line);

        const yOffset = labelTxt.height + 15;
        const slotWidth = width / 3;

        const createBtn = (texture, color, slotIndex) => {
            const btn = new PIXI.Sprite(texture);
            btn.anchor.set(0.5);
            btn.scale.set(0.5);
            btn.x = slotWidth * slotIndex + slotWidth / 2;
            btn.y = yOffset + 20;
            applyTintColor(btn, color);
            btn.eventMode = 'static';
            btn.cursor = 'pointer';
            btn.alpha = 0.8;
            row.addChild(btn);
            return btn;
        };

        row.icon = createBtn(iconTexture, colors[0], 0);
        row.btn1 = createBtn(buttonTextures[0] || this.assets.button, colors[1], 1);
        row.btn2 = createBtn(buttonTextures[1] || this.assets.button, colors[2], 2);

        return row;
    }

}
