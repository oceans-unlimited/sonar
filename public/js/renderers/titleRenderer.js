import { Container, Graphics, FillGradient, Sprite, TextStyle, Text } from "pixi.js";
import { GodrayFilter } from "pixi-filters";
import { Colors, Font } from "../core/uiStyle.js";
import { TypewriterText } from "../ui/effects/typewriter.js";
import { applyFlickerEffect } from "../ui/effects/flickerEffect.js";

/**
 * Title Renderer
 * Handles the visual presentation of the Title Scene.
 */
export class TitleRenderer {
    constructor(app, assets, audioManager) {
        this.app = app;
        this.assets = assets;
        this.audioManager = audioManager;
        this.views = {
            menu: null,
            buttons: {}
        };
    }

    render(container) {
        // 1. Background Gradient
        const gradient = new FillGradient({
            type: "linear",
            start: { x: 0, y: 0 },
            end: { x: 0, y: this.app.screen.height },
            colorStops: [
                { offset: 0, color: 0x263138 },
                { offset: 0.3, color: 0x171f21 },
                { offset: 0.8, color: 0x0c0c0c }
            ],
            textureSpace: 'global'
        });

        const bg = new Graphics()
            .rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill(gradient);
        container.addChild(bg);

        // 2. God Rays
        const rays = new Sprite(this.assets.god_rays);
        rays.alpha = 0.1;
        rays.width = this.app.screen.width;
        rays.height = this.app.screen.height * 1.5;
        container.addChild(rays);

        const godray = new GodrayFilter({
            alpha: 0.2,
            gain: 0.3,
            lacunarity: 2.7,
            angle: 20,
            parallel: true
        });
        rays.filters = [godray];

        // 3. Typewriter Intro
        const style = new TextStyle({
            fontFamily: 'Orbitron',
            fontSize: 24,
            fill: '#33ff33',
            dropShadow: true,
            dropShadowColor: '#00aa00',
            dropShadowDistance: 1,
        });

        const tw = new TypewriterText(
            'INITIALIZING SYSTEMS...\nESTABLISHING SATELLITE UPLINK...',
            style,
            this.audioManager,
            { speed: 50 }
        );
        tw.start();
        tw.container.x = 60;
        tw.container.y = 100;
        container.addChild(tw.container);

        // 4. Animation Loop
        let menuCreated = false;
        const tickerCallback = (ticker) => {
            rays.y += 0.05 * ticker.deltaTime;
            if (rays.y > 0) rays.y = -this.app.screen.height * 0.5;
            rays.alpha = 0.1 + Math.sin(ticker.lastTime * 0.001) * 0.05;
            godray.time += 0.01 * ticker.deltaTime;
            tw.update(ticker.deltaMS);

            if (tw.isDone && !menuCreated) {
                menuCreated = true;
                this.menuTimeout = setTimeout(() => {
                    if (container.destroyed) return;
                    tw.clear();
                    // Check if tw and its container are still alive before accessing properties
                    if (tw && tw.container && !tw.container.destroyed && tw.textObj && !tw.textObj.destroyed) {
                        this.createMenu(container, tw.container.x, tw.container.y + tw.textObj.height + 40);
                    }
                }, 1000);
            }
        };
        this.app.ticker.add(tickerCallback);

        // Cleanup hook
        container.on('destroyed', () => {
            this.app.ticker.remove(tickerCallback);
            if (this.menuTimeout) clearTimeout(this.menuTimeout);
            tw.destroy();
        });

        return this.views;
    }

    createMenu(container, x, y) {
        const menu = new Container();
        this.views.menu = menu;
        container.addChild(menu);

        const items = ["Start", "Settings"];
        const menuTexts = [];
        let offsetY = y;

        for (const item of items) {
            const text = new Text({
                text: item.toUpperCase(),
                style: {
                    fontFamily: Font.family,
                    fontSize: Font.size,
                    fill: Colors.text,
                    letterSpacing: Font.letterSpacing,
                }
            });
            text.x = x;
            text.y = offsetY;

            // Interaction setup
            text.eventMode = 'static';
            text.cursor = 'pointer';

            menu.addChild(text);
            menuTexts.push(text);
            this.views.buttons[item.toLowerCase()] = text;

            offsetY += Font.lineHeight;
        }

        const cursor = new Text({ text: ">", style: { fontFamily: Font.family, fontSize: Font.size, fill: Colors.text } });
        cursor.x = menuTexts[0].x - 20;
        cursor.y = menuTexts[0].y;
        menu.addChild(cursor);

        applyFlickerEffect(this.app, [...menuTexts, cursor], 0.15, 3);
    }
}
