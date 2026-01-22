import * as PIXI from 'pixi.js';

export class TypewriterText {
  constructor(text, style, audioManager, options = {}) {
    this.container = new PIXI.Container();
    this.textObj = new PIXI.Text({text: '', style});
    this.container.addChild(this.textObj);

    this.fullText = text;
    this.audio = audioManager;
    this.speed = options.speed || 40; // ms per character
    this.lineBreakPause = options.lineBreakPause || 1000; // ms to pause on line break

    this.index = 0;
    this.timer = 0;
    this.isDone = false;
    this.isPlaying = false;

    this.isPaused = false;
    this.pauseTimer = 0;
  }

  start() {
      if(this.isPlaying) return;
      this.isPlaying = true;
      this.audio.playSound('teletype', { loop: true });
  }

  pause(duration) {
      if(!this.isPlaying) return;
      this.isPaused = true;
      this.pauseTimer = duration;
      this.audio.stopSound('teletype');
  }

  update(deltaMS) {
    if (this.isDone || !this.isPlaying) return;

    if (this.isPaused) {
        this.pauseTimer -= deltaMS;
        if (this.pauseTimer <= 0) {
            this.isPaused = false;
            if (!this.isDone) {
                this.audio.playSound('teletype', { loop: true });
            }
        }
        return;
    }

    this.timer += deltaMS;
    if (this.timer >= this.speed) {
      this.timer = 0;
      if (this.index < this.fullText.length) {
        const char = this.fullText[this.index];
        
        if (char === '\n') {
            this.pause(this.lineBreakPause);
        }
        
        this.index++;
        this.textObj.text = this.fullText.substring(0, this.index);

      } else {
        this.isDone = true;
        this.isPlaying = false;
        this.audio.stopSound('teletype');
      }
    }
  }

  clear() {
      this.textObj.text = '';
      this.index = 0;
      this.isDone = false;
      this.isPlaying = false;
      this.isPaused = false;
      this.pauseTimer = 0;
      this.audio.stopSound('teletype');
  }

  destroy() {
    this.audio.stopSound('teletype');
    this.container.destroy({ children: true });
  }
}
