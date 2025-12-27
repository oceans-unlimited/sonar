export function applyFlickerEffect(app, targets, amplitude = 0.02, frequency = 10) {
    const flickerCallback = () => {
        const flicker = 1 + Math.sin(app.ticker.lastTime * frequency * 0.001) * amplitude;
        let anyAlive = false;
        for (const obj of targets) {
            if (obj && !obj.destroyed) {
                obj.alpha = flicker;
                anyAlive = true;
            }
        }
        if (!anyAlive && targets.length > 0) {
            app.ticker.remove(flickerCallback);
        }
    };
    app.ticker.add(flickerCallback);

    return flickerCallback;
}

export function applyColorBlink(targets, app, foregroundColor, backgroundColor, flickerCount = 2, flickOn = true) {
    if (!Array.isArray(targets)) {
        targets = [targets];
    }

    let currentTicker = null;

    const blink = () => {
        if (currentTicker) {
            app.ticker.remove(currentTicker);
        }

        let count = 0;
        const maxCount = flickerCount;
        const interval = 6; // run every 4 frames for example
        let frameCounter = 0;

        // Start with the background color
        targets.forEach(target => { target.tint = backgroundColor; });

        currentTicker = () => {
            frameCounter++;
            if (frameCounter % interval === 0) {
                count++;
                if (count > maxCount) {
                    targets.forEach(target => { target.tint = flickOn ? foregroundColor : backgroundColor; });
                    app.ticker.remove(currentTicker);
                    currentTicker = null;
                    return;
                }

                if (targets[0].tint === foregroundColor) {
                    targets.forEach(target => { target.tint = backgroundColor; });
                } else {
                    targets.forEach(target => { target.tint = foregroundColor; });
                }
            }
        };

        app.ticker.add(currentTicker);
    };

    const destroy = () => {
        if (currentTicker) {
            app.ticker.remove(currentTicker);
            currentTicker = null;
        }
    };

    targets.forEach(target => {
        target.on('destroyed', destroy);
    });

    return {
        blink,
        destroy,
    };
}
