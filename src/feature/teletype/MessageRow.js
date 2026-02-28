import { Container, Text } from 'pixi.js';
import { TeletypeStyle } from '../../core/uiStyle.js';

/**
 * A single row in the teletype system.
 * Uses a single Text object — typewriter effect is achieved by
 * progressively appending characters to Text.text.
 * 
 * No SplitText, no flatten. One Text object per row, always.
 */
export class MessageRow extends Container {
    constructor(messageText, styleOverrides = null, options = {}) {
        super();
        this.messageText = messageText;
        this.typingDelay = options.typingDelay || 30;
        this.isAnimating = false;

        // Only clone when we need to mutate — otherwise share the global
        if (styleOverrides && typeof styleOverrides === 'object') {
            this.textStyle = TeletypeStyle.clone();
            Object.assign(this.textStyle, styleOverrides);
        } else {
            this.textStyle = TeletypeStyle;
        }

        // Single Text object — starts empty, filled during animate()
        this.textObj = new Text({ text: '', style: this.textStyle });
        this.addChild(this.textObj);
    }

    /**
     * Typewriter effect: append one character at a time.
     */
    async animate() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        for (let i = 0; i < this.messageText.length; i++) {
            this.textObj.text = this.messageText.slice(0, i + 1);
            await new Promise(r => setTimeout(r, this.typingDelay));
        }

        this.isAnimating = false;
    }
}
