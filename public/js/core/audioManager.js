// audioManager.js
export class AudioManager {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.buffer = null;
  }

  async loadBeep(url) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
  }

  playBeep(pitch = 1.0) {
    if (!this.buffer) return;
    const src = this.context.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = pitch;
    src.connect(this.context.destination);
    src.start(0);
  }
}
