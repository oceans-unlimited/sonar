// texturePaths = { explosion: '../../assets/textures/explosion.png', bubble: '../../assets/textures/bubble.png', displacement: '../../assets/textures/water_displacement.png' }

function underwaterExplosion(app, texturePaths) {
  const container = new PIXI.Container();
  app.stage.addChild(container);

  // --- Explosion Core ---
  const explosion = PIXI.Sprite.from(texturePaths.explosion);
  explosion.anchor.set(0.5);
  explosion.x = app.screen.width / 2;
  explosion.y = app.screen.height / 2;
  explosion.scale.set(0.1);
  explosion.alpha = 0;
  container.addChild(explosion);

  // --- Displacement Map (for underwater ripple) ---
  const displacementSprite = PIXI.Sprite.from(texturePaths.displacement);
  const displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite);
  displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  displacementSprite.scale.set(0.6);
  app.stage.addChild(displacementSprite);

  // --- Bloom (light burst effect) ---
  const bloom = new PIXI.filters.AdvancedBloomFilter({
    threshold: 0.3,
    bloomScale: 1.2,
    brightness: 1.4,
  });

  explosion.filters = [displacementFilter, bloom];

  // --- Particle System ---
  const particles = new PIXI.ParticleContainer(120, { scale: true, alpha: true, position: true });
  container.addChild(particles);

  function spawnParticle() {
    const p = PIXI.Sprite.from(texturePaths.bubble);
    p.anchor.set(0.5);
    p.x = explosion.x;
    p.y = explosion.y;
    p.scale.set(0.05 + Math.random() * 0.15);
    p.alpha = 1;
    p.vx = (Math.random() - 0.5) * 3;
    p.vy = (Math.random() - 0.5) * 3 - 0.5;
    p.tick = 0;
    p.update = function () {
      this.tick++;
      this.x += this.vx;
      this.y += this.vy;
      this.vy -= 0.02; // upward drift
      this.alpha -= 0.02;
      if (this.alpha <= 0) particles.removeChild(this);
    };
    particles.addChild(p);
  }

  // --- Animate ---
  let t = 0;
  let active = false;

  function triggerExplosion() {
    t = 0;
    active = true;
    explosion.alpha = 1;
    explosion.scale.set(0.1);
    for (let i = 0; i < 20; i++) spawnParticle();
  }

  app.ticker.add((delta) => {
    // animate displacement map for ripple
    displacementSprite.x += delta * 2;
    displacementSprite.y += delta * 1;

    // explosion pulse
    if (active) {
      t += delta * 0.06;
      explosion.scale.set(0.1 + t * 0.5);
      explosion.alpha = Math.max(1 - t * 0.6, 0);
      bloom.brightness = 1.4 + Math.sin(t * 3) * 0.4;

      // end explosion after fade-out
      if (explosion.alpha <= 0) active = false;
    }

    // particle updates
    for (const p of particles.children) p.update();
  });

  // public API
  return {
    container,
    trigger: triggerExplosion
  };
}
