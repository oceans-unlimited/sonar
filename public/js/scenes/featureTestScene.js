import * as PIXI from 'pixi.js';
import { socketManager } from '../core/socketManager.js';
import { DamageRenderer } from '../features/damage/DamageRenderer.js';
import { DamageController } from '../features/damage/DamageController.js';
import { Colors, Font } from '../core/uiStyle.js';

export async function createFeatureTestScene(app, assets) {
    const scene = new PIXI.Container();

    // 1. Setup Mock UI Area
    const uiContainer = new PIXI.Container();
    uiContainer.x = 20;
    uiContainer.y = 20;
    scene.addChild(uiContainer);

    // Sub Profile Mock
    const subProfile = new PIXI.Sprite(assets.sub_profileA);
    subProfile.scale.set(0.6);
    uiContainer.addChild(subProfile);

    // Sub Label Mock
    const subLabel = new PIXI.Text({
        text: 'USS TEST BED',
        style: { fontFamily: Font.family, fontSize: 10, fill: Colors.text }
    });
    subLabel.y = 37;
    uiContainer.addChild(subLabel);

    // 2. Initialize Damage System
    const damageRenderer = new DamageRenderer(app, assets);
    damageRenderer.mount(uiContainer, subProfile, subLabel, scene);
    damageRenderer.updateLayout(300);

    const damageController = new DamageController(app, damageRenderer, scene);
    damageController.lastHealth = 4; // Initialize health tracking for testing
    damageRenderer.update(4); // Initialize visual state

    // 3. Create HTML Harness
    const harnessId = 'feature-test-harness';
    let harness = document.getElementById(harnessId);
    if (harness) harness.remove();

    harness = document.createElement('div');
    harness.id = harnessId;
    harness.style.position = 'absolute';
    harness.style.top = '100px';
    harness.style.right = '10px';
    harness.style.width = '320px';
    harness.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    harness.style.color = '#fff';
    harness.style.padding = '15px';
    harness.style.fontFamily = 'Goldman, monospace';
    harness.style.border = '1px solid #00ff00';
    harness.style.zIndex = '1000';

    harness.innerHTML = `
        <h2 style="margin-top: 0; color: #00ff00;">Feature Test Room</h2>

        <div style="margin-bottom: 20px;">
            <strong>Damage Simulation</strong>
            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button id="btn-dmg-1" style="padding: 8px;">Take 1 Damage</button>
                <button id="btn-dmg-2" style="padding: 8px;">Take 2 Damage</button>
                <button id="btn-repair" style="padding: 8px;">Repair Full</button>
                <button id="btn-crit" style="padding: 8px; background: #900;">Set Critical (1)</button>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                Current Health: <span id="health-val">4</span> / 4
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <strong>Visual Tests</strong>
            <div style="margin-top: 5px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button id="btn-test-effects" style="padding: 5px;">Test Effects</button>
                <button id="btn-test-glow" style="padding: 5px;">Test Glow</button>
                <button id="btn-test-tint" style="padding: 5px;">Test Tint</button>
                <button id="btn-test-gauge" style="padding: 5px;">Test Gauge</button>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <strong>Role Sim</strong>
            <div style="margin-top: 5px;">
                <button id="btn-swap-sub" style="width: 100%; padding: 5px;">Swap Sub (A/B)</button>
            </div>
        </div>

        <div id="feat-log" style="font-size: 11px; height: 120px; overflow-y: auto; background: #111; padding: 5px; border: 1px solid #333;">
            System Ready...
        </div>
    `;

    document.body.appendChild(harness);

    // 4. Test Logic
    let mockHealth = 4;
    let isSubA = true;

    const log = (msg) => {
        const featLog = document.getElementById('feat-log');
        if (featLog) {
            featLog.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            featLog.scrollTop = featLog.scrollHeight;
        }
    };

    const updateMockState = (newHealth) => {
        mockHealth = Math.max(0, Math.min(4, newHealth));
        document.getElementById('health-val').textContent = mockHealth;

        // Use the current player ID from socketManager, or set a default for testing
        const playerId = socketManager.playerId || 'test-player';
        if (!socketManager.playerId) socketManager.playerId = playerId;

        const state = {
            submarines: [{
                id: 'sub-test',
                co: playerId,
                health: mockHealth,
                color: isSubA ? '#00aaff' : '#ff5555'
            }]
        };

        // Directly call the controller for reliable testing
        damageController.handleStateUpdate(state);
        log(`State Updated: Health ${mockHealth} for player ${playerId}`);
    };

    document.getElementById('btn-dmg-1').addEventListener('click', () => updateMockState(mockHealth - 1));
    document.getElementById('btn-dmg-2').addEventListener('click', () => updateMockState(mockHealth - 2));
    document.getElementById('btn-repair').addEventListener('click', () => updateMockState(4));
    document.getElementById('btn-crit').addEventListener('click', () => updateMockState(1));

    document.getElementById('btn-test-effects').addEventListener('click', () => {
        damageController.triggerDamageFeedback(2);
        log('Triggered damage effects (screen tint + shake)');
    });

    document.getElementById('btn-test-glow').addEventListener('click', () => {
        damageRenderer.update(1);
        log('Updated to health 1 (should trigger glow)');
    });

    document.getElementById('btn-test-tint').addEventListener('click', () => {
        damageRenderer.update(2);
        log('Updated to health 2 (should change tint to orange)');
    });

    document.getElementById('btn-test-gauge').addEventListener('click', () => {
        damageRenderer.update(3);
        log('Updated to health 3 (should show 3 gauge fills in yellow)');
    });

    document.getElementById('btn-swap-sub').addEventListener('click', () => {
        isSubA = !isSubA;
        subProfile.texture = isSubA ? assets.sub_profileA : assets.sub_profileB;
        log(`Sub swapped to: ${isSubA ? 'Type A' : 'Type B'}`);
        updateMockState(mockHealth); // Re-trigger state with new color/context
    });

    // Cleanup
    scene.on('destroyed', () => {
        if (harness) harness.remove();
        damageController.destroy();
    });

    return scene;
}
