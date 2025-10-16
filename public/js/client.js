import { Application, Assets } from 'pixi.js';
import { SceneManager } from './core/sceneManager.js';
import { socketManager } from './core/socketManager.js';
import { AudioManager } from './core/audioManager.js';

(async () => {
  // Create a new application
  const app = new Application();
  // The background color is set by the scene, so we don't need it here.
  await app.init({ resizeTo: window });
  document.body.appendChild(app.canvas);

  const audioManager = new AudioManager();
  await audioManager.loadBeep('assets/audio/beep_01.wav');

  // Pre-load any assets needed for the scenes
  const assets = {
      orbitron: await Assets.load('assets/fonts/Orbitron-VariableFont_wght.ttf'),
      goldman_bold: await Assets.load('assets/fonts/Goldman-Bold.ttf'),
      goldman_regular: await Assets.load('assets/fonts/Goldman-Regular.ttf'),
      // placeholder for assets. In a real app, you'd load them here.
      noise: await Assets.load('assets/textures/noise.png'),
      scanlines: await Assets.load('assets/textures/scanlines.png'),
      // chart_overlay will be needed by menuScene
      chart_overlay: await Assets.load('assets/textures/light_rays.png'), // using a placeholder
      god_rays: await Assets.load('assets/textures/god_rays_03.png'),
      map_sprites: await Assets.load('assets/sprites/ocean_02.png'),
      sub_sheet: await Assets.load('assets/sprites/sub.json'),
      sub_profileA: await Assets.load('assets/ui/sub_profileA.svg'),
      sub_profileB: await Assets.load('assets/ui/sub_profileB.svg'),
      role_captain: await Assets.load('assets/ui/role_captain.svg'),
      role_engineer: await Assets.load('assets/ui/role_engineer.svg'),
      role_firstofficer: await Assets.load('assets/ui/role_firstofficer.svg'),
      role_sonar: await Assets.load('assets/ui/role_sonar.svg'),
      thumb: await Assets.load('assets/ui/thumb.svg'),
  };

  await SceneManager.init(app, assets, socketManager, audioManager);

  document.getElementById('sceneTitleBtn').addEventListener('click', () => {
    SceneManager.changeScene('title');
  });
  document.getElementById('sceneMenuBtn').addEventListener('click', () => {
    SceneManager.changeScene('menu');
  });
  document.getElementById('sceneConnBtn').addEventListener('click', () => {
    SceneManager.changeScene('conn');
  });
  document.getElementById('sceneDebugRotationBtn').addEventListener('click', () => {
    SceneManager.changeScene('debugRotation');
  });
  document.getElementById('sceneLobbyBtn').addEventListener('click', () => {
    SceneManager.changeScene('lobby');
  });
})();
