import { Application, Assets } from 'pixi.js';
import { SceneManager } from './core/sceneManager';
import { socketManager } from './core/socketManager';
import '@pixi/layout/devtools';
import '@pixi/layout';

(async () => {

  const app = new Application();
  globalThis.__PIXI_APP__ = app;

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#001100',
    resizeTo: window,
  });

  app.stage.layout = {
    width: window.innerWidth,
    height: window.innerHeight,
    justifyContent: 'center',
    alignItems: 'center'
  };

  document.body.appendChild(app.canvas);

  await Assets.init({ basePath: '/assets/' });
  await Assets.load({ alias: 'vessel', src: 'vessel.svg' });
  await Assets.load({ alias: 'weapons', src: 'weapons.svg' });
  await Assets.load({ alias: 'reactor', src: 'reactor.svg' });
  await Assets.load({ alias: 'detection', src: 'detection.svg' });
  await Assets.load({ alias: 'circuitFrame', src: 'circuit_frame.svg' });
  await Assets.load({ alias: 'gridTag', src: 'grid_tag.svg' });
  await Assets.load({ alias: 'reactorTag', src: 'reactor_tag.svg' });
  await Assets.load({ alias: 'buttonFrame', src: 'button.svg' });
  await Assets.load({ alias: 'cpt', src: 'cpt.svg' });
  await Assets.load({ alias: 'subA', src: 'sub_profileA.svg' })

  const sceneManager = new SceneManager(app);

  // Director Mode Integration
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.get('mode') === 'test';

  if (isTestMode) {
    console.log('🎬 DIRECTOR MODE ACTIVATED');
    const { Director } = await import('./debug/Director');
    const { DebugOverlay } = await import('./debug/DebugOverlay');

    app.director = new Director();
    app.socket = app.director; // Inject as mock socket
    socketManager.bindSocket(app.socket);

    const overlay = new DebugOverlay(app.director, sceneManager);
    overlay.mount();
  }

  await sceneManager.init();
})();