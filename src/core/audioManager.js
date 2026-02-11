// audioManager.js
export class AudioManager {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = {};
    this.sources = {};
    this.isResumed = false;
  }

  resume() {
    if (this.isResumed) return;
    this.isResumed = true;
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  async loadSound(name, url) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    this.buffers[name] = await this.context.decodeAudioData(arrayBuffer);
  }

  playSound(name, { loop = false, pitch = 1.0 } = {}) {
    if (!this.buffers[name]) return;

    // Stop any existing sound with the same name
    if (this.sources[name]) {
      this.sources[name].stop();
    }

    const src = this.context.createBufferSource();
    src.buffer = this.buffers[name];
    src.playbackRate.value = pitch;
    src.loop = loop;
    src.connect(this.context.destination);
    src.start(0);

    this.sources[name] = src;
  }

  stopSound(name) {
    if (this.sources[name]) {
      this.sources[name].stop();
      delete this.sources[name];
    }
  }
}

