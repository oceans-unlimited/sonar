//Computer terminal style startup and game menus
import * as PIXI from "pixi.js";
import { Colors, Font, Layout } from "../core/uiStyle.js";
import { createNoiseOverlay, createScanlinesOverlay, applyFlickerEffect } from "../core/uiEffects.js";

export function createMenuScene(app, assets) {
  const root = new PIXI.Container();

  // --- Mask to create a "windowed" effect ---
  const mask = new PIXI.Graphics();
  mask.beginFill(0xFFFFFF); // Color doesn't matter for a mask
  mask.drawRect(Layout.margin, Layout.margin, Layout.menuWidth, Layout.menuHeight);
  mask.endFill();
  root.addChild(mask);
  root.mask = mask;

  // --- Chart overlay (will be clipped by the mask) ---
  const chart = new PIXI.Sprite(assets.chart_overlay);
  chart.alpha = 0.25;
  chart.width = app.screen.width;
  chart.height = app.screen.height;
  root.addChild(chart);

  // --- Menu panel ---
  const panel = new PIXI.Graphics();
  // Give the panel a semi-transparent background
  panel.beginFill(Colors.background, 0.9);
  panel.lineStyle(1, Colors.border);
  panel.drawRect(Layout.margin, Layout.margin, Layout.menuWidth, Layout.menuHeight);
  panel.endFill();
  root.addChild(panel);

  // --- Title ---
  const title = new PIXI.Text("CAPTAIN SONAR", {
    fontFamily: Font.family,
    fontSize: Font.size + 6,
    fill: Colors.text,
    letterSpacing: Font.letterSpacing,
  });
  title.x = Layout.margin + Layout.panelPadding;
  title.y = Layout.margin + Layout.panelPadding;
  root.addChild(title);

  // --- Menu items ---
  const items = ["Status", "Navigation", "Sonar", "Weapons", "Diagnostics", "Exit"];
  const menuTexts = [];
  let offsetY = title.y + Font.lineHeight * 2;

  for (const item of items) {
    // Stop adding items if they would overflow the panel height
    if (offsetY > Layout.menuHeight - Font.lineHeight) {
        break;
    }
    const text = new PIXI.Text(item.toUpperCase(), {
      fontFamily: Font.family,
      fontSize: Font.size,
      fill: Colors.text,
      letterSpacing: Font.letterSpacing,
    });
    text.x = Layout.margin + Layout.panelPadding + 20;
    text.y = offsetY;
    root.addChild(text);
    menuTexts.push(text);
    offsetY += Font.lineHeight;
  }

  let flickerCallback;
  // --- Cursor ---
  if (menuTexts.length > 0) {
    const cursor = new PIXI.Text(">", { fontFamily: Font.family, fontSize: Font.size, fill: Colors.text });
    cursor.x = Layout.margin + Layout.panelPadding;
    cursor.y = menuTexts[0].y;
    root.addChild(cursor);
    // Add cursor to flicker effect
    flickerCallback = applyFlickerEffect(app, [...menuTexts, cursor, title]);
  } else {
    flickerCallback = applyFlickerEffect(app, [title]);
  }

  root.on('destroyed', () => {
      if(flickerCallback) {
          app.ticker.remove(flickerCallback);
      }
  });


  // --- Overlays (will be clipped by the mask) ---
  const noise = createNoiseOverlay(assets.noise, app);
  const scan = createScanlinesOverlay(assets.scanlines, app);
  root.addChild(noise);
  root.addChild(scan);

  // --- Animation ---
  // The flicker effect is now applied conditionally based on whether menu items were added

  return root;
}