import { Container, Text } from "pixi.js";
import { SceneManager } from "../core/sceneManager.js";

export async function createBootScene(app, assets, audioManager) {
  const scene = new Container();

  // Press/tap prompt
  const promptText = new Text({
    text: 'PRESS ANY KEY OR TAP TO ACTIVATE AUDIO',
    style: {
      fontFamily: 'Orbitron',
      fontSize: 18,
      fill: '#33ff33',
      align: 'center',
    }
  });
  promptText.anchor.set(0.5);
  promptText.x = app.screen.width / 2;
  promptText.y = app.screen.height / 2;
  scene.addChild(promptText);

  // Unlock audio on any interaction: key press, mouse click, or touch
  function waitForUserInteraction() {
    const unlockAudio = async () => {
      await audioManager.resume(); // unlock Web Audio
      removeListeners();
      SceneManager.changeScene('title'); // transition to title scene
    };

    const removeListeners = () => {
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });
  }

  waitForUserInteraction();

  return scene;
}

