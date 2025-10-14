import * as PIXI from 'pixi.js';

export class TypewriterText {
  constructor(text, style, audioManager, options = {}) {
    this.container = new PIXI.Container();
    this.textObj = new PIXI.Text({text: '', style});
    this.container.addChild(this.textObj);

    this.fullText = text;
    this.audio = audioManager;
    this.speed = options.speed || 40; // ms per character
    this.pitchRange = options.pitchRange || [0.9, 1.2];
    this.cursorBlink = options.cursorBlink ?? true;

    this.index = 0;
    this.timer = 0;
    this.isDone = false;

    this.cursor = new PIXI.Text({text: '_', style});
    this.cursor.alpha = 1;
    this.cursor.visible = this.cursorBlink;
    this.container.addChild(this.cursor);
  }

  update(deltaMS) {
    if (this.isDone) return;

    this.timer += deltaMS;
    if (this.timer >= this.speed) {
      this.timer = 0;
      if (this.index < this.fullText.length) {
        this.index++;
        this.textObj.text = this.fullText.substring(0, this.index);

        // Randomized beep pitch
        const pitch = this.pitchRange[0] + Math.random() * (this.pitchRange[1] - this.pitchRange[0]);
        this.audio.playBeep(pitch);
      } else {
        this.isDone = true;
        if (this.cursorBlink) this.cursorBlinkStart();
      }
    }

    // Keep cursor positioned after text
    const bounds = this.textObj.getBounds();
    this.cursor.x = bounds.x + bounds.width + 4;
    this.cursor.y = bounds.y;
  }

  cursorBlinkStart() {
    if (!this.cursorBlink) return;
    this.blinkTicker = setInterval(() => {
      this.cursor.visible = !this.cursor.visible;
    }, 400);
  }

  destroy() {
    clearInterval(this.blinkTicker);
    this.container.destroy({ children: true });
  }
}
