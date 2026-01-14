
import * as PIXI from 'pixi.js';
import { MapSystem } from '../features/map/MapSystem.js';
import { socketManager } from '../core/socketManager.js';

export async function createMapTestScene(app, assets) {
    const scene = new PIXI.Container();

    // 1. Initialize Map System
    const mapSystem = new MapSystem(app, assets);
    mapSystem.init({ width: 800, height: 600 });
    mapSystem.show();
    scene.addChild(mapSystem.container);

    // 2. Create HTML Harness
    const harnessId = 'map-test-harness';
    let harness = document.getElementById(harnessId);

    // Cleanup existing harness if re-entering scene
    if (harness) {
        harness.remove();
    }

    harness = document.createElement('div');
    harness.id = harnessId;
    harness.style.position = 'absolute';
    harness.style.top = '60px'; // Below overlay panel
    harness.style.right = '10px';
    harness.style.width = '300px';
    harness.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    harness.style.color = '#fff';
    harness.style.padding = '10px';
    harness.style.fontFamily = 'monospace';
    harness.style.border = '1px solid #444';
    harness.style.zIndex = '1000';
    harness.style.maxHeight = '80vh';
    harness.style.overflowY = 'auto';

    harness.innerHTML = `
        <h3 style="margin-top: 0">Map Test Harness</h3>
        <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
            <em>Note: Click map to enter SELECTING mode and enable Hover preview.</em>
        </div>
        
        <div style="margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">
            <strong>Renderer Controls</strong>
            <div style="margin-top: 5px;">
                <label>Ownship (R, C):</label>
                <input type="number" id="h-own-r" value="7" style="width: 30px">
                <input type="number" id="h-own-c" value="7" style="width: 30px">
                <button id="btn-update-own">Update</button>
            </div>
            <div style="margin-top: 5px;">
                <label>Target (R, C):</label>
                <input type="number" id="h-tar-r" value="5" style="width: 30px">
                <input type="number" id="h-tar-c" value="5" style="width: 30px">
                <button id="btn-update-tar">Selection</button>
            </div>
             <div style="margin-top: 5px;">
                <label>Viewport (X,Y,W,H):</label><br>
                <input type="number" id="h-vp-x" value="0" style="width: 40px">
                <input type="number" id="h-vp-y" value="0" style="width: 40px">
                <input type="number" id="h-vp-w" value="500" style="width: 40px">
                <input type="number" id="h-vp-h" value="500" style="width: 40px">
                <button id="btn-vp">Set</button>
            </div>
        </div>

        <div style="margin-bottom: 10px;">
            <strong>Socket Spoofing</strong>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin-top: 5px;">
                <div></div>
                <button id="btn-mv-n">N</button>
                <div></div>
                <button id="btn-mv-w">W</button>
                <button id="btn-mv-stop">Stop</button>
                <button id="btn-mv-e">E</button>
                <div></div>
                <button id="btn-mv-s">S</button>
                <div></div>
            </div>
            <div style="margin-top: 5px;">
                <button id="btn-spoof-pos">Spoof Pos (Use Ownship)</button>
            </div>
        </div>

        <div style="margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">
            <strong>Track Visualization</strong>
            <div style="margin-top: 5px;">
                <label><input type="checkbox" id="chk-track-layer" checked> Show Track Layer</label>
            </div>
            <div style="margin-top: 5px;">
                <label><input type="checkbox" id="chk-ownship-sprite" checked> Show Ownship Sprite</label>
            </div>
            <div style="margin-top: 5px;">
                <button id="btn-clear-track">Clear Track History</button>
            </div>
            <div style="margin-top: 5px;">
                <label>Track Color: </label>
                <input type="color" id="track-color" value="#ffffff" style="width: 50px;">
            </div>
            <div style="margin-top: 5px; font-size: 10px; color: #aaa;">
                Track Length: <span id="track-length">0</span>
            </div>
        </div>

        <div style="margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;">
            <strong>Detonation FX</strong>
            <div style="margin-top: 5px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
                <input type="number" id="h-exp-r" placeholder="Row (0-14)" value="7">
                <input type="number" id="h-exp-c" placeholder="Col (0-14)" value="7">
            </div>
            <div style="margin-top: 5px;">
                <button id="btn-detonate">Trigger Detonation (700ms FX)</button>
            </div>
        </div>

        
        <div id="harness-log" style="font-size: 10px; height: 100px; overflow-y: scroll; border: 1px solid #333; padding: 2px; margin-top: 10px;">
            Log initialized...
        </div>
    `;

    document.body.appendChild(harness);

    // 3. Harness Logic
    const log = (msg) => {
        const logDiv = document.getElementById('harness-log');
        if (logDiv) {
            logDiv.innerHTML += `<div>${msg}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }
    };

    // Helper: Get inputs
    const getVal = (id) => parseInt(document.getElementById(id).value, 10);

    // Renderer Bindings
    document.getElementById('btn-update-own').addEventListener('click', () => {
        const r = getVal('h-own-r');
        const c = getVal('h-own-c');
        mapSystem.renderer.updateOwnship(r, c);
        log(`Called updateOwnship(${r}, ${c})`);
    });

    document.getElementById('btn-update-tar').addEventListener('click', () => {
        const r = getVal('h-tar-r');
        const c = getVal('h-tar-c');
        mapSystem.renderer.highlightSelection(r, c);
        // Also update HUD for target
        mapSystem.renderer.updateHUD({ target: { row: r, col: c } });
        log(`Called highlightSelection(${r}, ${c})`);
    });

    document.getElementById('btn-detonate').addEventListener('click', () => {
        const r = getVal('h-exp-r');
        const c = getVal('h-exp-c');

        // Ensure we have a primed state for ownship so range calculations work etc.
        if (!socketManager.playerId) {
            spoofPosition(currentR, currentC);
        }

        // Mock the TORPEDO_RESOLUTION interrupt
        import('../features/interrupts/InterruptManager.js').then(({ interruptManager }) => {
            import('../features/interrupts/InterruptTypes.js').then(({ InterruptTypes }) => {
                interruptManager.requestInterrupt(InterruptTypes.TORPEDO_RESOLUTION, { row: r, col: c });

                // End it after animation duration + buffer (e.g., 2.5s)
                setTimeout(() => {
                    interruptManager.resolveInterrupt(InterruptTypes.TORPEDO_RESOLUTION);
                }, 2500);
            });
        });

        log(`Triggered Detonation at ${r}, ${c}`);
    });


    document.getElementById('btn-vp').addEventListener('click', () => {
        const x = getVal('h-vp-x');
        const y = getVal('h-vp-y');
        const w = getVal('h-vp-w');
        const h = getVal('h-vp-h');
        mapSystem.renderer.setViewport(x, y, w, h);
        log(`Called setViewport(${x}, ${y}, ${w}, ${h})`);
    });

    // Spoofing Logic
    let currentR = 7;
    let currentC = 7;
    let pastTrack = []; // Accumulate track history
    let trackColor = 0xFFFFFF; // Default white

    const spoofPosition = (r, c) => {
        // Add current position to track before moving if it's the first point or a new move
        if (pastTrack.length === 0 || pastTrack[pastTrack.length - 1].row !== currentR || pastTrack[pastTrack.length - 1].col !== currentC) {
            pastTrack.push({ row: currentR, col: currentC });
        }

        // Limit track to 15 positions
        if (pastTrack.length > 15) {
            pastTrack.shift();
        }

        currentR = r;
        currentC = c;

        // Add new position to track
        pastTrack.push({ row: r, col: c });
        if (pastTrack.length > 15) {
            pastTrack.shift();
        }

        // Update track length display
        const trackLenSpan = document.getElementById('track-length');
        if (trackLenSpan) trackLenSpan.textContent = pastTrack.length;

        // Ensure we have a player ID for the controller to recognize "us"
        if (!socketManager.playerId) {
            socketManager.playerId = 'test-player';
            log('set socketManager.playerId = test-player');
        }
        const myId = socketManager.playerId;

        const state = {
            phase: 'LIVE', // Ensure phase allows updates
            gameStateData: {},
            submarines: [{
                id: 'sub-1',
                co: myId, // Claim we are the captain
                row: r,     // Server uses row
                col: c,     // Server uses col
                past_track: [...pastTrack], // Server uses snake_case
                mines: [],
                submarineState: 'SUBMERGED',
                color: '#00ff00',
                actionGauges: { mine: 0, torpedo: 0, drone: 0, sonar: 0, silence: 0 }
            }],
            board: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Ownship at 7,7 is here (Water)
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // Some land

                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ]
        };

        log(`Spoofing State: ${r}, ${c} (Track: ${pastTrack.length})`);
        socketManager.emit('stateUpdate', state);

        // Also update the harness inputs to match
        document.getElementById('h-own-r').value = r;
        document.getElementById('h-own-c').value = c;
    };

    // Track Visualization Controls
    document.getElementById('chk-track-layer').addEventListener('change', (e) => {
        mapSystem.controller.setTrackLayerVisibility(e.target.checked);
        log(`Track layer visibility: ${e.target.checked}`);
    });

    document.getElementById('chk-ownship-sprite').addEventListener('change', (e) => {
        mapSystem.controller.showOwnship = e.target.checked;
        log(`Ownship visibility set to: ${e.target.checked}`);

        // Re-trigger state update to update masking
        const state = socketManager.lastState;
        if (state) socketManager.emit('stateUpdate', state);
    });

    document.getElementById('btn-clear-track').addEventListener('click', () => {
        pastTrack = [];
        const trackLenSpan = document.getElementById('track-length');
        if (trackLenSpan) trackLenSpan.textContent = '0';
        mapSystem.renderer.clearTrack('ownship');
        log('Track history cleared');
    });

    document.getElementById('track-color').addEventListener('change', (e) => {
        const hexColor = e.target.value;
        trackColor = parseInt(hexColor.replace('#', '0x'), 16);
        log(`Track color changed to: ${hexColor}`);
        mapSystem.controller.setTrackColor('ownship', trackColor);
    });

    // We also need to override the initial track update color in MapController for this test scene if needed,
    // but the MapController uses Colors.text. For the test harness, we'll just let it use white.

    document.getElementById('btn-mv-n').addEventListener('click', () => spoofPosition(currentR - 1, currentC));
    document.getElementById('btn-mv-s').addEventListener('click', () => spoofPosition(currentR + 1, currentC));
    document.getElementById('btn-mv-w').addEventListener('click', () => spoofPosition(currentR, currentC - 1));
    document.getElementById('btn-mv-e').addEventListener('click', () => spoofPosition(currentR, currentC + 1));

    document.getElementById('btn-spoof-pos').addEventListener('click', () => {
        const r = getVal('h-own-r');
        const c = getVal('h-own-c');
        spoofPosition(r, c);
    });

    // 4. System Event Listeners for Harness Log
    mapSystem.container.on('map:stateChanged', (data) => {
        log(`<span style="color: #00ff00">[STATE]</span> ${data.transition}`);
    });

    mapSystem.container.on('map:selectedSquare', (data) => {
        log(`<span style="color: #ffff00">[SELECT]</span> R${data.row} C${data.col}`);
    });

    mapSystem.container.on('map:selectionCleared', () => {
        log(`<span style="color: #ff4444">[CLEAR]</span> Selection reset`);
    });

    // Clean up hook
    scene.on('destroyed', () => {
        if (harness) harness.remove();
        mapSystem.destroy();
    });

    return scene;
}
