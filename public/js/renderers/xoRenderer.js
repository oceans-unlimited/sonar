import * as PIXI from "pixi.js";
import { Colors, Font, SystemColors } from "../core/uiStyle.js";
import { renderControlPanel, positionColumns } from "./panelRenderer.js";
import { applyTintColor, applyGlowEffect } from "../ui/effects/glowEffect.js";

/**
 * XO Renderer
 * Handles visual construction of the XO scene.
 * Stylistic Gold Standard for app-wide control panels.
 */
export class XORenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;
        this.views = {
            panels: [],
            subsystems: new Map() // colorName -> row
        };
    }

    render(parent) {
        const root = new PIXI.Container();
        parent.addChild(root);

        // 1. Background
        const bg = new PIXI.Graphics()
            .rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: Colors.background, alpha: 0.9 })
            .stroke({ color: Colors.border, width: 1 });
        root.addChild(bg);

        const container = new PIXI.Container();
        root.addChild(container);

        const colWidth = 300;
        const colSpacing = 16;
        const colHeight = 420;

        // 2. Create Panels
        const panelDetection = renderControlPanel(this.app, this.assets, {
            name: "Detection",
            color: SystemColors.detection,
            width: colWidth,
            height: colHeight
        });

        const panelWeapons = renderControlPanel(this.app, this.assets, {
            name: "Weapons",
            color: SystemColors.weapons,
            width: colWidth,
            height: colHeight
        });

        const panelVessel = renderControlPanel(this.app, this.assets, {
            name: "Vessel",
            color: SystemColors.stealth,
            width: colWidth,
            height: colHeight
        });

        container.addChild(panelDetection, panelWeapons, panelVessel);
        positionColumns(container, this.app.screen.width, colWidth, colSpacing);

        // 3. Populate Panels with Subsystem Rows
        this.createSubsystemRows(panelDetection, panelWeapons, panelVessel);

        return {
            root,
            panels: [panelDetection, panelWeapons, panelVessel],
            subsystems: this.views.subsystems
        };
    }

    createSubsystemRows(panelDetection, panelWeapons, panelVessel) {
        // Detection
        const pingRow = this.createSubsystemRow({
            label: "Active Sonar",
            icon: this.assets.ping_sys,
            gauge: this.assets.four_gauge,
            fills: [this.assets.four_gauge_fill1, this.assets.four_gauge_fill2, this.assets.four_gauge_fill3, this.assets.four_gauge_fill4],
            colorName: 'detection'
        });
        pingRow.x = 10;
        pingRow.y = 40;
        panelDetection.addChild(pingRow);
        this.views.subsystems.set('sonar', pingRow);

        const droneRow = this.createSubsystemRow({
            label: "Drone",
            icon: this.assets.drone_sys,
            gauge: this.assets.three_gauge,
            fills: [this.assets.three_gauge_fill1, this.assets.three_gauge_fill2, this.assets.three_gauge_fill3],
            colorName: 'detection',
            statusLabel: "LAUNCH"
        });
        droneRow.x = 10;
        droneRow.y = pingRow.y + pingRow.height + 20;
        panelDetection.addChild(droneRow);
        this.views.subsystems.set('drone', droneRow);

        // Weapons
        const mineRow = this.createSubsystemRow({
            label: "Mine",
            icon: this.assets.mine_sys,
            gauge: this.assets.three_gauge,
            fills: [this.assets.three_gauge_fill1, this.assets.three_gauge_fill2, this.assets.three_gauge_fill3],
            colorName: 'weapons',
            statusLabel: "ARMED"
        });
        mineRow.x = 10;
        mineRow.y = 40;
        panelWeapons.addChild(mineRow);
        this.views.subsystems.set('mine', mineRow);

        const torpedoRow = this.createSubsystemRow({
            label: "Torpedo",
            icon: this.assets.torpedo_sys,
            gauge: this.assets.three_gauge,
            fills: [this.assets.three_gauge_fill1, this.assets.three_gauge_fill2, this.assets.three_gauge_fill3],
            colorName: 'weapons',
            statusLabel: "ARMED"
        });
        torpedoRow.x = 10;
        torpedoRow.y = mineRow.y + mineRow.height + 20;
        panelWeapons.addChild(torpedoRow);
        this.views.subsystems.set('torpedo', torpedoRow);

        // Vessel
        const stealthRow = this.createSubsystemRow({
            label: "Silent Running",
            icon: this.assets.stealth_sys,
            gauge: this.assets.six_gauge,
            fills: [this.assets.six_gauge_fill1, this.assets.six_gauge_fill2, this.assets.six_gauge_fill3, this.assets.six_gauge_fill4, this.assets.six_gauge_fill5, this.assets.six_gauge_fill6],
            colorName: 'stealth'
        });
        stealthRow.x = 10;
        stealthRow.y = 40;
        panelVessel.addChild(stealthRow);
        this.views.subsystems.set('silence', stealthRow);

        // Scenario placeholder logic from original
        const scenarioRow = this.createSubsystemRow({
            label: "Scenario",
            icon: this.assets.scenario_sys,
            gauge: this.assets.four_gauge,
            fills: [this.assets.four_gauge_fill1, this.assets.four_gauge_fill2, this.assets.four_gauge_fill3, this.assets.four_gauge_fill4],
            colorName: 'stealth'
        });
        scenarioRow.x = 10;
        scenarioRow.y = stealthRow.y + stealthRow.height + 20;
        panelVessel.addChild(scenarioRow);
        this.views.subsystems.set('scenario', scenarioRow);
    }

    createSubsystemRow(config) {
        const { label, icon, gauge, fills, colorName, statusLabel = "READY" } = config;
        const row = new PIXI.Container();
        const color = SystemColors[colorName];

        // 1. Header and line
        const nameText = new PIXI.Text({
            text: label.toUpperCase(),
            style: { fontFamily: Font.family, fontSize: 13, fill: color }
        });
        row.addChild(nameText);
        const headerLine = new PIXI.Graphics()
            .rect(0, nameText.y + nameText.height + 2, 180, 1)
            .fill({ color: color, alpha: 0.5 });
        row.addChild(headerLine);

        const verticalOffset = nameText.height + headerLine.height + 10;

        // 2. Icon
        const iconSprite = new PIXI.Sprite(icon);
        iconSprite.scale.set(0.5);
        iconSprite.systemName = colorName;
        iconSprite.y = verticalOffset;
        applyTintColor(iconSprite, color);
        row.addChild(iconSprite);

        // 3. Gauge
        const gaugeSprite = new PIXI.Sprite(gauge);
        gaugeSprite.scale.set(0.5);
        gaugeSprite.systemName = colorName;
        gaugeSprite.x = iconSprite.width + 10;
        gaugeSprite.y = verticalOffset;
        applyTintColor(gaugeSprite, color);
        row.addChild(gaugeSprite);

        // 4. Fill Layer
        const fillContainer = new PIXI.Container();
        fillContainer.x = gaugeSprite.x;
        fillContainer.y = gaugeSprite.y;
        row.addChild(fillContainer);

        const fillSprites = fills.map(texture => {
            const fill = new PIXI.Sprite(texture);
            fill.scale.set(0.5);
            fill.visible = false;
            fill.eventMode = 'none';
            fillContainer.addChild(fill);
            return fill;
        });

        // 5. Status Text
        const statusText = new PIXI.Text({
            text: statusLabel.toUpperCase(),
            style: { fontFamily: Font.family, fontSize: 13, fontWeight: 'bold', fill: color }
        });
        statusText.x = gaugeSprite.x + gaugeSprite.width + 10;
        statusText.y = verticalOffset + (gaugeSprite.height - statusText.height) / 2;
        statusText.visible = false;
        statusText.eventMode = 'none';
        row.addChild(statusText);

        const fillGlow = applyGlowEffect(fillContainer, this.app, color);
        const statusPulse = applyGlowEffect(statusText, this.app, color);
        fillGlow.off();
        statusPulse.off();

        // View API is now handled by the Controller.
        // The Renderer only exposes the raw sprites and containers.

        row.iconSprite = iconSprite;
        row.gaugeSprite = gaugeSprite;
        row.fillGlow = fillGlow;
        row.statusPulse = statusPulse;
        row.statusText = statusText;
        row.fillSprites = fillSprites;

        return row;
    }
}
