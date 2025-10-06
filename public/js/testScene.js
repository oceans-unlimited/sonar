// public/js/testScene.js
import { Text } from 'pixi.js';

export function createTestScene(app) {
  const titleText = new Text("Captain Sonar v2.0", {
    fontFamily: "Arial",
    fontSize: 64,
    fill: "#00ff99",
    stroke: { color: "#000000", width: 6 },
    dropShadow: {
      color: "#000000",
      blur: 4,
      angle: Math.PI / 6,
      distance: 6
    }
  });
  titleText.anchor.set(0.5);
  titleText.x = app.screen.width / 2;
  titleText.y = 120;
  app.stage.addChild(titleText);
}
