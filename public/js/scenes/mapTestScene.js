
import * as PIXI from 'pixi.js';
import { MapSystem } from '../features/map/MapSystem.js';
import { socketManager } from '../core/socketManager.js';

export async function createMapTestScene(app, assets) {
    const scene = new PIXI.Container();

    // 1. Initialize Map System
    const mapSystem = new MapSystem(app, assets);
    mapSystem.init({ width: 800, height: 600, center: { x: 7, y: 7 } });
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

    const spoofPosition = (r, c) => {
        currentR = r;
        currentC = c;

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
                past_track: [], // Server uses snake_case
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

        log(`Spoofing State: ${r}, ${c}`);
        socketManager.emit('stateUpdate', state);

        // Also update the harness inputs to match
        document.getElementById('h-own-r').value = r;
        document.getElementById('h-own-c').value = c;
    };

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
