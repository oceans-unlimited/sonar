import { AnimatedSprite, Ticker } from 'pixi.js';

export class SubmarineAnimation {
    /**
     * @param {PIXI.Application} app
     * @param {PIXI.Container} container
     * @param {Object} assets - must include a PIXI.Spritesheet named 'sub_sheet'
     * @param {Function} isValidDirection - callback (dir) => boolean
     */
    constructor(app, container, assets, isValidDirection) {
        this.app = app;
        this.container = container;
        this.isValidDirection = isValidDirection || (() => true);

        this.currentDir = 'N';
        this.isTurning = false;
        this.isMoving = false;

        // Use the spritesheet to get the frames
        const sheet = assets.sub_sheet;
        this.frames = {
            N: sheet.textures['n.png'],
            E: sheet.textures['e.png'],
            S: sheet.textures['s.png'],
            W: sheet.textures['w.png'],
            NE: sheet.textures['ne.png'],
            SE: sheet.textures['se.png'],
            SW: sheet.textures['sw.png'],
            NW: sheet.textures['nw.png'],
        };

        this.directionAngles = {
            'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
            'S': 180, 'SW': 225, 'W': 270, 'NW': 315
        };

        // Create an AnimatedSprite
        this.sprite = new AnimatedSprite([this.frames[this.currentDir]]);
        this.sprite.animationSpeed = 0.2;
        this.sprite.loop = false;
        this.sprite.anchor.set(0.5);
        this.sprite.x = app.renderer.width / 2;
        this.sprite.y = app.renderer.height / 2;
        container.addChild(this.sprite);

        // Animation parameters
        this.moveDistance = 32;
        this.turnDuration = 250;
        this.moveDuration = 300;

        this.ticker = new Ticker();
        this.ticker.start();
    }

    getFrameSequence(fromDir, toDir) {
        const dirOrder = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const fromIndex = dirOrder.indexOf(fromDir);
        const toIndex = dirOrder.indexOf(toDir);

        const diff = (toIndex - fromIndex + 8) % 8;
        const turnDir = (diff <= 4 && diff !== 0) ? 1 : -1;

        const sequence = [];
        let currentIndex = fromIndex;

        while (currentIndex !== toIndex) {
            sequence.push(this.frames[dirOrder[currentIndex]]);
            currentIndex = (currentIndex + turnDir + 8) % 8;
        }
        sequence.push(this.frames[dirOrder[toIndex]]);

        return sequence;
    }

    async startTurn(newDir) {
        if (this.isTurning || this.isMoving) return;
        if (!this.isValidDirection(newDir)) return;

        if (newDir === this.currentDir) {
            await this.moveForward(newDir);
            return;
        }

        this.isTurning = true;

        const frameSequence = this.getFrameSequence(this.currentDir, newDir);
        
        this.sprite.textures = frameSequence;
        // Adjust animation speed based on number of frames to maintain duration
        this.sprite.animationSpeed = frameSequence.length / (this.turnDuration / (1000 / 60)); 
        
        const turnComplete = new Promise(resolve => {
            this.sprite.onComplete = resolve;
        });

        this.sprite.gotoAndPlay(0);

        await turnComplete;

        this.sprite.onComplete = null; // Clean up listener
        this.currentDir = newDir;
        this.isTurning = false;

        // Move after turning
        await this.moveForward(newDir);
    }

    moveForward(direction) {
        return new Promise((resolve) => {
            this.isMoving = true;
            const rad = (this.directionAngles[direction] * Math.PI) / 180;
            const dx = Math.sin(rad) * this.moveDistance;
            const dy = -Math.cos(rad) * this.moveDistance;

            const startX = this.sprite.x;
            const startY = this.sprite.y;
            const endX = startX + dx;
            const endY = startY + dy;

            let elapsed = 0;
            const step = (ticker) => {
                elapsed += ticker.deltaMS;
                const t = Math.min(elapsed / this.moveDuration, 1);
                const ease = t * t * (3 - 2 * t); // smoothstep
                this.sprite.x = startX + (endX - startX) * ease;
                this.sprite.y = startY + (endY - startY) * ease;

                if (t >= 1) {
                    this.isMoving = false;
                    this.ticker.remove(step);
                    resolve();
                }
            };
            this.ticker.add(step);
        });
    }

    destroy() {
        this.ticker.stop();
        this.sprite.destroy();
    }
}
