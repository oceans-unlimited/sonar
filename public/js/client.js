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
  await audioManager.loadSound('beep', 'assets/audio/beep_01.wav');
  await audioManager.loadSound('teletype', 'assets/audio/teletype02.wav');

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
      // Engine assets
      label: await Assets.load('assets/ui/directionLabel.svg'),
      border: await Assets.load('assets/ui/directionBorder.svg'),
      corners: await Assets.load('assets/ui/directionCorners.svg'),
      toggle: await Assets.load('assets/ui/toggle.svg'),
      circuitColor: await Assets.load('assets/ui/circuitColor.svg'),
      stealth: await Assets.load('assets/ui/stealth.svg'),
      detection: await Assets.load('assets/ui/detection.svg'),
      weapons: await Assets.load('assets/ui/weapons.svg'),
      reactor: await Assets.load('assets/ui/reactor.svg'),
      disabled: await Assets.load('assets/ui/disabled.svg'),
      ping_sys: await Assets.load('assets/ui/ping_sys.svg'),
      four_gauge: await Assets.load('assets/ui/4_gauge.svg'),
      four_gauge_fill1: await Assets.load('assets/ui/4_gauge_fill1.svg'),
      four_gauge_fill2: await Assets.load('assets/ui/4_gauge_fill2.svg'),
      four_gauge_fill3: await Assets.load('assets/ui/4_gauge_fill3.svg'),
      four_gauge_fill4: await Assets.load('assets/ui/4_gauge_fill4.svg'),
      drone_sys: await Assets.load('assets/ui/drone_sys.svg'),
      three_gauge: await Assets.load('assets/ui/3_gauge.svg'),
      three_gauge_fill1: await Assets.load('assets/ui/3_gauge_fill1.svg'),
      three_gauge_fill2: await Assets.load('assets/ui/3_gauge_fill2.svg'),
      three_gauge_fill3: await Assets.load('assets/ui/3_gauge_fill3.svg'),
      mine_sys: await Assets.load('assets/ui/mine_sys.svg'),
      torpedo_sys: await Assets.load('assets/ui/torpedo_sys.svg'),
      stealth_sys: await Assets.load('assets/ui/stealth_sys.svg'),
      six_gauge: await Assets.load('assets/ui/6_gauge.svg'),
      six_gauge_fill1: await Assets.load('assets/ui/6_gauge_fill1.svg'),
      six_gauge_fill2: await Assets.load('assets/ui/6_gauge_fill2.svg'),
      six_gauge_fill3: await Assets.load('assets/ui/6_gauge_fill3.svg'),
      six_gauge_fill4: await Assets.load('assets/ui/6_gauge_fill4.svg'),
      six_gauge_fill5: await Assets.load('assets/ui/6_gauge_fill5.svg'),
      six_gauge_fill6: await Assets.load('assets/ui/6_gauge_fill6.svg'),
      scenario_sys: await Assets.load('assets/ui/scenario_sys.svg'),
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
  document.getElementById('sceneEngineBtn').addEventListener('click', () => {
    SceneManager.changeScene('engine');
  });
  document.getElementById('sceneXoBtn').addEventListener('click', () => {
    SceneManager.changeScene('xo');
  });
})();
