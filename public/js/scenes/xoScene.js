// public/js/scenes/xoScene.js

import * as PIXI from "pixi.js";
import { Colors, Font, SystemColors } from "../core/uiStyle.js";
import {
    createNoiseOverlay,
    createScanlinesOverlay,
    applyTintColor,
    createButtonStateManager,
    applyGlowEffect,
} from "../core/uiEffects.js";

function positionColumns(container, screenWidth, colWidth, spacing) {
    const totalWidth = 3 * colWidth + 2 * spacing;
    const startX = (screenWidth - totalWidth) / 2;

    // Always arrange horizontally (Landscape Lock)
    container.children.forEach((c, i) => {
        c.x = startX + i * (colWidth + spacing);
        c.y = 80;
    });
}

function createSubsystemRow(subsystemLabel, iconTexture, gaugeTexture, fillTextures, colorName, app, assets, allSubsystems, statusTextContent = "READY") {
    const row = new PIXI.Container();
    const color = SystemColors[colorName];

    // Header and line
    const subsystemNameText = new PIXI.Text({ text: subsystemLabel.toUpperCase(), style: { fontFamily: Font.family, fontSize: 13, fill: color } });
    row.addChild(subsystemNameText);
    const headerLine = new PIXI.Graphics().rect(0, subsystemNameText.y + subsystemNameText.height + 2, 180, 1).fill({ color: color, alpha: 0.5 });
    row.addChild(headerLine);

    const verticalOffset = subsystemNameText.height + headerLine.height + 10;

    const icon = new PIXI.Sprite(iconTexture);
    icon.scale.set(0.5);
    icon.systemName = colorName;
    icon.y = verticalOffset;
    applyTintColor(icon, color);
    row.addChild(icon);

    const gauge = new PIXI.Sprite(gaugeTexture);
    gauge.scale.set(0.5);
    gauge.systemName = colorName;
    gauge.x = icon.width + 10;
    gauge.y = verticalOffset;
    applyTintColor(gauge, color);
    row.addChild(gauge);

    const iconStateManager = createButtonStateManager(icon, app, assets.disabled);
    const gaugeStateManager = createButtonStateManager(gauge, app, assets.disabled);

    const fillContainer = new PIXI.Container();
    fillContainer.x = gauge.x;
    fillContainer.y = gauge.y;
    row.addChild(fillContainer);

    const fills = fillTextures.map(texture => {
        const fill = new PIXI.Sprite(texture);
        fill.scale.set(0.5);
        fill.visible = false;
        fill.eventMode = 'none'; // Ensure clicks pass through
        fillContainer.addChild(fill);
        return fill;
    });

    const statusText = new PIXI.Text({ text: statusTextContent.toUpperCase(), style: { fontFamily: Font.family, fontSize: 13, fontWeight: 'bold', fill: color } });
    statusText.x = gauge.x + gauge.width + 10;
    statusText.y = verticalOffset + (gauge.height - statusText.height) / 2;
    statusText.visible = false;
    statusText.eventMode = 'none'; // Ensure clicks pass through
    row.addChild(statusText);

    const fillGlow = applyGlowEffect(fillContainer, app, color);
    const statusPulse = applyGlowEffect(statusText, app, color);
    fillGlow.off();
    statusPulse.off();

    let currentLevel = 0;
    const maxLevel = fills.length;

    row.isFull = () => currentLevel === maxLevel;
    row.setActive = () => {
        if (!row.isFull()) {
            iconStateManager.setActive();
            gaugeStateManager.setActive();
        }
    };
    row.setDisabled = () => {
        iconStateManager.setDisabled();
        gaugeStateManager.setDisabled();
        fillGlow.off();
        statusPulse.off();
    };
    row.setNeutral = () => {
        iconStateManager.setNeutral();
        gaugeStateManager.setNeutral();
    };
    row.setReadyToDischarge = () => {
        iconStateManager.setActive();
        gaugeStateManager.setActive();
        statusText.visible = true;
        fillGlow.pulse();
        statusPulse.pulse();
    };

    const discharge = () => {
        currentLevel = 0;
        fills.forEach(fill => {
            fill.visible = false;
        });
        statusText.visible = false;
        fillGlow.off();
        statusPulse.off();
        row.setDisabled();
    };

    row.eventMode = 'static';
    row.cursor = 'pointer';
    row.on('pointerdown', () => {
        if (icon.eventMode !== 'static' && !row.isFull()) return;

        if (row.isFull()) {
            discharge();
            return;
        }

        currentLevel = (currentLevel + 1);
        fills.forEach((fill, index) => {
            fill.visible = index < currentLevel;
            if (fill.visible) applyTintColor(fill, color);
        });

        allSubsystems.forEach(sub => {
            if (sub.isFull()) {
                sub.setReadyToDischarge();
            } else {
                sub.setDisabled();
            }
        });
    });

    return row;
}

function createSystemPanel(name, color, width, height, assets, app) {
    const panel = new PIXI.Container();
    const border = new PIXI.Graphics()
        .rect(0, 0, width, height)
        .stroke({ color: color, width: 2 });
    panel.addChild(border);

    const title = new PIXI.Text({
        text: name,
        style: {
            fontFamily: Font.family,
            fontSize: 20,
            fill: color,
        },
    });
    title.x = 10;
    title.y = 8;
    panel.addChild(title);

    return panel;
}

export async function createXOScene(app, assets) {
    const root = new PIXI.Container();
    const bg = new PIXI.Graphics()
        .rect(0, 0, app.screen.width, app.screen.height)
        .fill({ color: Colors.background, alpha: 0.9 })
        .stroke({ color: Colors.border, width: 1 });
    root.addChild(bg);

    const container = new PIXI.Container();
    root.addChild(container)

    const colWidth = 300;
    const colSpacing = 16;
    const colHeight = 420;

    const panel1 = createSystemPanel("Detection", SystemColors.detection, colWidth, colHeight, assets, app);
    const panel2 = createSystemPanel("Weapons", SystemColors.weapons, colWidth, colHeight, assets, app);
    const panel3 = createSystemPanel("Vessel", SystemColors.stealth, colWidth, colHeight, assets, app);

    const subsystems = [];

    const pingSubsystem = createSubsystemRow("Active Sonar", assets.ping_sys, assets.four_gauge, [assets.four_gauge_fill1, assets.four_gauge_fill2, assets.four_gauge_fill3, assets.four_gauge_fill4], 'detection', app, assets, subsystems);
    pingSubsystem.x = 10;
    pingSubsystem.y = 40;
    panel1.addChild(pingSubsystem);
    subsystems.push(pingSubsystem);

    const droneSubsystem = createSubsystemRow("Drone", assets.drone_sys, assets.three_gauge, [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3], 'detection', app, assets, subsystems, "LAUNCH");
    droneSubsystem.x = 10;
    droneSubsystem.y = pingSubsystem.y + pingSubsystem.height + 20; // Adjusted positioning
    panel1.addChild(droneSubsystem);
    subsystems.push(droneSubsystem);

    const mineSubsystem = createSubsystemRow("Mine", assets.mine_sys, assets.three_gauge, [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3], 'weapons', app, assets, subsystems, "ARMED");
    mineSubsystem.x = 10;
    mineSubsystem.y = 40;
    panel2.addChild(mineSubsystem);
    subsystems.push(mineSubsystem);

    const torpedoSubsystem = createSubsystemRow("Torpedo", assets.torpedo_sys, assets.three_gauge, [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3], 'weapons', app, assets, subsystems, "ARMED");
    torpedoSubsystem.x = 10;
    torpedoSubsystem.y = mineSubsystem.y + mineSubsystem.height + 20;
    panel2.addChild(torpedoSubsystem);
    subsystems.push(torpedoSubsystem);

    const stealthSubsystem = createSubsystemRow("Silent Running", assets.stealth_sys, assets.six_gauge, [assets.six_gauge_fill1, assets.six_gauge_fill2, assets.six_gauge_fill3, assets.six_gauge_fill4, assets.six_gauge_fill5, assets.six_gauge_fill6], 'stealth', app, assets, subsystems);
    stealthSubsystem.x = 10;
    stealthSubsystem.y = 40;
    panel3.addChild(stealthSubsystem);
    subsystems.push(stealthSubsystem);

    const scenarioSubsystem = createScenarioSubsystem(assets, 'stealth', app, subsystems);
    scenarioSubsystem.x = 10;
    scenarioSubsystem.y = stealthSubsystem.y + stealthSubsystem.height + 20;
    panel3.addChild(scenarioSubsystem);
    subsystems.push(scenarioSubsystem);

    const handleMove = () => {
        subsystems.forEach(sub => {
            if (sub.isFull()) {
                sub.setDisabled();
            } else {
                sub.setActive();
            }
        });
    };

    const onKeyDown = (e) => {
        if (e.code === 'KeyM') {
            e.preventDefault();
            handleMove();
        }
    };

    window.addEventListener('keydown', onKeyDown);
    root.on('destroyed', () => {
        window.removeEventListener('keydown', onKeyDown);
    });

    [panel1, panel2, panel3].forEach(panel => {
        const noise = createNoiseOverlay(assets.noise, app, colWidth, colHeight);
        const scan = createScanlinesOverlay(assets.scanlines, app, colWidth, colHeight);
        panel.addChild(noise, scan);
    });

    container.addChild(panel1, panel2, panel3);

    positionColumns(container, app.screen.width, colWidth, colSpacing);

    return root;
}

function createScenarioSubsystem(assets, colorName, app, allSubsystems) {
    // ... (switch statement remains the same)
    const gaugeType = 'four';

    let gaugeTexture, fillTextures;

    switch (gaugeType) {
        case 'three':
            gaugeTexture = assets.three_gauge;
            fillTextures = [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3];
            break;
        case 'four':
            gaugeTexture = assets.four_gauge;
            fillTextures = [assets.four_gauge_fill1, assets.four_gauge_fill2, assets.four_gauge_fill3, assets.four_gauge_fill4];
            break;
        case 'six':
            gaugeTexture = assets.six_gauge;
            fillTextures = [assets.six_gauge_fill1, assets.six_gauge_fill2, assets.six_gauge_fill3, assets.six_gauge_fill4, assets.six_gauge_fill5, assets.six_gauge_fill6];
            break;
    }
    return createSubsystemRow("Scenario", assets.scenario_sys, gaugeTexture, fillTextures, colorName, app, assets, allSubsystems);
}
