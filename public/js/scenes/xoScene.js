// public/js/scenes/xoScene.js

import * as PIXI from "pixi.js";
import { Colors, Font, SystemColors } from "../core/uiStyle.js";
import {
  createNoiseOverlay,
  createScanlinesOverlay,
  applyTintColor,
  createButtonStateManager,
} from "../core/uiEffects.js";

function positionColumns(container, screenWidth, colWidth, spacing) {
  const totalWidth = 3 * colWidth + 2 * spacing;
  let startX = (screenWidth - totalWidth) / 2;
  if (screenWidth < 768) {
    // Stack vertically
    let y = 80;
    container.children.forEach((c) => {
      c.x = (screenWidth - colWidth) / 2;
      c.y = y;
      y += c.height + spacing;
    });
  } else {
    // Arrange horizontally
    container.children.forEach((c, i) => {
      c.x = startX + i * (colWidth + spacing);
      c.y = 80;
    });
  }
}

function createSubsystemRow(iconTexture, gaugeTexture, fillTextures, colorName, app, assets) {
    const row = new PIXI.Container();

    const color = SystemColors[colorName];

    const icon = new PIXI.Sprite(iconTexture);
    icon.scale.set(0.5);
    icon.systemName = colorName;
    applyTintColor(icon, color);
    row.addChild(icon);

    const gauge = new PIXI.Sprite(gaugeTexture);
    gauge.scale.set(0.5);
    gauge.x = icon.width + 10;
    gauge.systemName = colorName;
    applyTintColor(gauge, color);

    const iconStateManager = createButtonStateManager(icon, app, assets.disabled);
    const gaugeStateManager = createButtonStateManager(gauge, app, assets.disabled);

    icon.on('rightdown', () => {
        if (icon.eventMode === 'static') {
            iconStateManager.setDisabled();
        } else {
            iconStateManager.setActive();
        }
    });

    gauge.on('rightdown', () => {
        if (gauge.eventMode === 'static') {
            gaugeStateManager.setDisabled();
        } else {
            gaugeStateManager.setActive();
        }
    });

    const fillContainer = new PIXI.Container();
    fillContainer.x = gauge.x;
    fillContainer.y = gauge.y;
    row.addChild(fillContainer);
    
    const fills = fillTextures.map(texture => {
        const fill = new PIXI.Sprite(texture);
        fill.scale.set(0.5);
        fill.visible = false;
        fillContainer.addChild(fill);
        return fill;
    });

    row.addChild(gauge);

    let currentLevel = 0;
    const maxLevel = fills.length;

    row.eventMode = 'static';
    row.cursor = 'pointer';
    row.on('pointerdown', () => {
        if (icon.eventMode !== 'static' || gauge.eventMode !== 'static') return;

        currentLevel = (currentLevel + 1) % (maxLevel + 1);
        fills.forEach((fill, index) => {
            fill.visible = index < currentLevel;
            if (fill.visible) {
                // Placeholder for charge-level indicator color logic
                applyTintColor(fill, color);
            }
        });
    });

    return row;
}

function createDummyPanel(name, color, width, height, assets, app) {
    const panel = new PIXI.Container();
    const border = new PIXI.Graphics()
        .rect(0, 0, width, height)
        .stroke({ color: color, width: 2 });
    panel.addChild(border);

    const title = new PIXI.Text({
        text: name,
        style: {
            fontFamily: Font.family,
            fontSize: 18,
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
  root.addChild(container);

  const colWidth = 300;
  const colSpacing = 16;
  const colHeight = 420;

  const panel1 = createDummyPanel("Detection", SystemColors.detection, colWidth, colHeight, assets, app);
  const panel2 = createDummyPanel("Weapons", SystemColors.weapons, colWidth, colHeight, assets, app);
  const panel3 = createDummyPanel("Vessel", SystemColors.stealth, colWidth, colHeight, assets, app);

  const pingSubsystem = createSubsystemRow(
      assets.ping_sys,
      assets.four_gauge,
      [
          assets.four_gauge_fill1,
          assets.four_gauge_fill2,
          assets.four_gauge_fill3,
          assets.four_gauge_fill4,
      ],
      'detection',
      app,
      assets
  );
  pingSubsystem.x = 10;
  pingSubsystem.y = 40;
  panel1.addChild(pingSubsystem);

  const droneSubsystem = createSubsystemRow(
      assets.drone_sys,
      assets.three_gauge,
      [
          assets.three_gauge_fill1,
          assets.three_gauge_fill2,
          assets.three_gauge_fill3,
      ],
      'detection',
      app,
      assets
  );
  droneSubsystem.x = 10;
  droneSubsystem.y = pingSubsystem.y + pingSubsystem.height / 2 + 40; // Position below ping
  panel1.addChild(droneSubsystem);

  const mineSubsystem = createSubsystemRow(
      assets.mine_sys,
      assets.three_gauge,
      [
          assets.three_gauge_fill1,
          assets.three_gauge_fill2,
          assets.three_gauge_fill3,
      ],
      'weapons',
      app,
      assets
    );
    mineSubsystem.x = 10;
    mineSubsystem.y = 40;
    panel2.addChild(mineSubsystem);

    const torpedoSubsystem = createSubsystemRow(
        assets.torpedo_sys,
        assets.three_gauge,
        [
            assets.three_gauge_fill1,
            assets.three_gauge_fill2,
            assets.three_gauge_fill3,
        ],
        'weapons',
        app,
        assets
    );
    torpedoSubsystem.x = 10;
    torpedoSubsystem.y = mineSubsystem.y + mineSubsystem.height / 2 + 40;
    panel2.addChild(torpedoSubsystem);

    const stealthSubsystem = createSubsystemRow(
        assets.stealth_sys,
        assets.six_gauge,
        [
            assets.six_gauge_fill1,
            assets.six_gauge_fill2,
            assets.six_gauge_fill3,
            assets.six_gauge_fill4,
            assets.six_gauge_fill5,
            assets.six_gauge_fill6,
        ],
        'stealth',
        app,
        assets
    );
    stealthSubsystem.x = 10;
    stealthSubsystem.y = 40;
    panel3.addChild(stealthSubsystem);

    const scenarioSubsystem = createScenarioSubsystem(assets, 'stealth', app);
    scenarioSubsystem.x = 10;
    scenarioSubsystem.y = stealthSubsystem.y + stealthSubsystem.height / 2 + 40;
    panel3.addChild(scenarioSubsystem);

  [panel1, panel2, panel3].forEach(panel => {
      const noise = createNoiseOverlay(assets.noise, app, colWidth, colHeight);
      const scan = createScanlinesOverlay(assets.scanlines, app, colWidth, colHeight);
      panel.addChild(noise, scan);
  });

  container.addChild(panel1, panel2, panel3);

  positionColumns(container, app.screen.width, colWidth, colSpacing);

  app.renderer.on("resize", () => {
    positionColumns(container, app.screen.width, colWidth, colSpacing);
  });

  return root;
}

function createScenarioSubsystem(assets, colorName, app) {
    // For now, default to 4-gauge. Later, this can be driven by server state.
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
        default:
            gaugeTexture = assets.four_gauge;
            fillTextures = [assets.four_gauge_fill1, assets.four_gauge_fill2, assets.four_gauge_fill3, assets.four_gauge_fill4];
    }

    return createSubsystemRow(assets.scenario_sys, gaugeTexture, fillTextures, colorName, app, assets);
}
