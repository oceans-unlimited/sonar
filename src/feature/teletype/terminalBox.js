import { LayoutContainer } from "@pixi/layout/components";
import { Container } from "pixi.js";
import { MessageRow } from "./MessageRow.js";

export const ROW_HEIGHT = 30;       // matches TeletypeStyle.lineHeight
const SCROLL_DURATION = 150; // ms for smooth scroll
const PADDING = 15;

/**
 * TerminalBox — a viewport-masked message terminal with smooth scrolling.
 * 
 * Architecture:
 *   TerminalBox (LayoutContainer, overflow: hidden, fixed size)
 *     └─ rowWrapper (Container, manually positioned)
 *         ├─ MessageRow 0  (y = 0 * ROW_HEIGHT)
 *         ├─ MessageRow 1  (y = 1 * ROW_HEIGHT)
 *         └─ MessageRow N  (y = N * ROW_HEIGHT)
 * 
 * On each new message:
 *   1. Add row at bottom of wrapper
 *   2. Tween wrapper.y up by ROW_HEIGHT (smooth scroll)
 *   3. Evict oldest row if over capacity
 *   4. Typewriter-animate the new row
 */
export default class TerminalBox extends LayoutContainer {
    constructor(options = {}) {
        super();

        const width = options.width || 400;
        const height = options.height || 150;
        this.typingDelay = options.typingDelay || 30;
        this.maxRows = options.maxRows || 10;
        this.terminalHeight = height;
        this.rows = [];

        // Viewport mask — overflow hidden clips scrolled content
        this.layout = {
            width: width,
            height: height,
            overflow: 'hidden',
        };

        // Inner wrapper — position is managed manually for smooth scrolling
        this.rowWrapper = new Container();
        this.rowWrapper.y = this.terminalHeight - PADDING;
        this.addChild(this.rowWrapper);
    }

    /**
     * Appends a new message, smooth-scrolls into view, then types it out.
     * @param {string} lineText - The text content for this row.
     * @param {Object|null} styleOverrides - Optional TextStyle property overrides.
     */
    async appendLine(lineText, styleOverrides = null) {
        if (lineText === undefined || lineText === null) return;

        const row = new MessageRow(lineText, styleOverrides, {
            typingDelay: this.typingDelay
        });

        // Position row at the next slot in the wrapper
        row.y = this.rows.length * ROW_HEIGHT;
        this.rowWrapper.addChild(row);
        this.rows.push(row);

        // Smooth scroll: tween wrapper up so the new row slides into view
        const targetY = this.terminalHeight - PADDING - (this.rows.length * ROW_HEIGHT);
        await this.tweenTo(this.rowWrapper, 'y', targetY, SCROLL_DURATION);

        // Evict oldest row if over capacity (already above the clip boundary)
        if (this.rows.length > this.maxRows) {
            const oldest = this.rows.shift();
            this.rowWrapper.removeChild(oldest);
            oldest.destroy({ children: true });

            // Re-index to keep coordinate space bounded
            this.rows.forEach((r, i) => r.y = i * ROW_HEIGHT);
            this.rowWrapper.y = this.terminalHeight - PADDING - (this.rows.length * ROW_HEIGHT);
        }

        // Type the new row after scroll completes
        await row.animate();

        return row;
    }

    /** Returns the Y position where the wrapper should be for bottom-aligned live view. */
    getLiveY() {
        return this.terminalHeight - PADDING - (this.rows.length * ROW_HEIGHT);
    }

    /**
     * Simple ease-out quadratic tween using requestAnimationFrame.
     */
    tweenTo(target, prop, to, duration) {
        return new Promise(resolve => {
            const from = target[prop];
            const delta = to - from;

            // Skip tween if negligible
            if (Math.abs(delta) < 0.5) {
                target[prop] = to;
                resolve();
                return;
            }

            const start = performance.now();

            function step(now) {
                const elapsed = now - start;
                const t = Math.min(elapsed / duration, 1);
                const eased = 1 - (1 - t) * (1 - t); // ease-out quad
                target[prop] = from + delta * eased;

                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    target[prop] = to;
                    resolve();
                }
            }

            requestAnimationFrame(step);
        });
    }
}