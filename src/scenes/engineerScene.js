import { SYSTEM_ASSETS, Fonts, Colors } from '../core/uiStyle.js';
import { Container, Text } from 'pixi.js';
import { LayoutContainer } from '@pixi/layout/components';
import { createButtonFromDef } from '../render/button.js';
import Panel from '../render/panel';
import { SystemStatusCard } from '../render/card';
import { wireButton } from '../behavior/buttonBehavior.js';
import { InterruptCoordinator } from '../feature/interrupt/InterruptCoordinator.js';
import { teletypeManager } from '../feature/teletype/TeletypeManager.js';
import { damageManager } from '../feature/damage/DamageManager.js';
import EngineerButtonBlock from '../render/engineerButtonBlock.js';

/**
 * Builds the Engineer scene graph.
 * This function now creates a container with a loading message and attaches a `populate`
 * method to it, which can be called later when data is available.
 * 
 * @param {Object} controller - The active SceneController instance.
 * @param {import('pixi.js').Ticker} ticker - The application ticker.
 * @returns {Container} The constructed scene container, initially in a loading state.
 */
export function createEngineScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'engineScene';

    // The layout is now hard-coded as this is a specific scene
    sceneContent.layout = {
        width: '100%',
        height: 'auto',
        flexDirection: 'row',
        padding: 15,
        justifyContent: 'center',
        // alignItems: 'baseline',
    };

    // --- Main Engine Panel ---
    const enginePanel = new Panel('engine', {
        label: 'enginePanel',
        borderWidth: 0
    });
    enginePanel.setAlpha(0);
    sceneContent.addChild(enginePanel);

    const loadingText = new Text({
        text: 'Awaiting initial state from server...',
        style: {
            fontFamily: Fonts.primary,
            fontSize: 18,
            fill: '#00ff00',
            align: 'center',
        },
        layout: {
            width: 'intrinsic',
            height: 'intrinsic',
        }
    });
    loadingText.anchor.set(0.5);
    enginePanel.addChild(loadingText);

    /**
     * Populates the scene with content once the initial layout is received.
     * @param {Object} initialLayout - The engine layout data from the server.
     */
    sceneContent.populate = (initialLayout) => {
        // Remove loading message
        enginePanel.removeChild(loadingText);
        loadingText.destroy();

        // Create a lookup for circuit colors: "direction:slotId" -> colorHex
        const circuitColorMap = {};
        if (initialLayout.circuits) {
            initialLayout.circuits.forEach(circuit => {
                if (circuit.connections) {
                    circuit.connections.forEach(conn => {
                        // We only care about frame slots for now regarding circuit colors
                        if (conn.slotType === 'frame') {
                            const key = `${conn.direction}:${conn.slotId}`;
                            circuitColorMap[key] = circuit.color;
                        }
                    });
                }
            });
        }

        const directionOrder = ['N', 'E', 'S', 'W'];

        directionOrder.forEach(dirKey => {
            const dirData = initialLayout.directions[dirKey];
            if (!dirData) return;

            const blockButtons = [];

            // Function to process button creation
            const processButton = (slotId, systemName, isFrame) => {
                const sysConfig = SYSTEM_ASSETS[systemName.toLowerCase()] || SYSTEM_ASSETS.empty;

                let frameColor = undefined;
                let tagColor = undefined;

                if (isFrame) {
                    // Look up circuit color
                    const circuitColor = circuitColorMap[`${dirKey}:${slotId}`];

                    // If part of a circuit, use that color. Otherwise, fallback to system color or grey.
                    if (circuitColor) {
                        frameColor = circuitColor;
                        tagColor = circuitColor;
                    } else {
                        frameColor = 0x555555; // Default dark grey for unconnected
                        tagColor = 0x555555;
                    }
                }

                const btnDef = {
                    id: `${dirKey}:${slotId}`,
                    asset: sysConfig.asset || (isFrame ? 'empty' : 'reactor'),
                    color: sysConfig.color, // Icon color remains system color
                    profile: isFrame ? 'circuit' : 'reactor',
                    event: 'CROSS_OFF',
                    frameColor: frameColor,
                    tagColor: tagColor,
                };

                const button = createButtonFromDef(btnDef);

                // Wire Metadata
                const logicDef = {
                    id: btnDef.id,
                    profile: btnDef.profile,
                    onPress: () => controller.handleEvent('CROSS_OFF', { direction: dirKey, slotId: slotId })
                };

                const wiredAPI = wireButton(button, logicDef);

                controller.registerButton(btnDef.id, wiredAPI);
                blockButtons.push(button);
            };

            // Reactors First
            Object.entries(dirData.reactorSlots).forEach(([id, name]) => processButton(id, name, false));

            // Frames Second
            Object.entries(dirData.frameSlots).forEach(([id, name]) => processButton(id, name, true));

            // Create Specialized Engineer Block
            const blockConfig = {
                label: dirKey, // Cardinal Direction (N, E, S, W)
                color: Colors.active // Initial default color
            };
            const block = new EngineerButtonBlock(blockButtons, 'horizontal', blockConfig);

            // Register frame for color control via cardinal ID
            controller.registerVisual(dirKey, block);

            enginePanel.addChild(block);
        });
    };

    // --- Control Panel ---
    const controlPanel = new Panel('control', {
        label: 'controlPanel',
        borderColor: Colors.primary,
        borderWidth: 2,
        padding: 15
    });
    controlPanel.setAlpha(0);

    controlPanel.layout = {
        width: '25%',
        minWidth: 300,
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between'
    };

    // A. Damage UI (Top - Persistent)
    const damageContainer = new Container();
    damageContainer.label = 'damageContainer';
    damageContainer.layout = { width: '100%', height: 'auto', marginBottom: 10 };
    controlPanel.addChild(damageContainer);

    damageManager.mount(ticker, sceneContent, damageContainer, {
        layout: { width: '100%' }
    });

    // B. Swap Wrapper (Middle)
    const swapWrapper = new Container();
    swapWrapper.label = 'swapWrapper';
    swapWrapper.layout = {
        flexGrow: 1,
        width: '100%',
        height: 'auto',
        flexDirection: 'column',
        gap: 15,
        overflow: 'hidden'
    };
    controlPanel.addChild(swapWrapper);

    // Normal Content Container
    const normalContent = new Container();
    normalContent.label = 'normalContent';
    normalContent.layout = {
        width: '100%',
        height: 'auto',
        flexDirection: 'column',
        gap: 15
    };
    swapWrapper.addChild(normalContent);

    // C. Teletype Terminal (Bottom - Persistent)
    const teletypeContainer = new Container();
    teletypeContainer.label = 'teletypeContainer';
    teletypeContainer.layout = { width: '100%', height: 150, marginTop: 10 };
    controlPanel.addChild(teletypeContainer);

    teletypeManager.mount(teletypeContainer, {
        width: '100%',
        height: 150,
        maxRows: 10
    });

    // Add System Status Cards to normalContent
    const systems = ['vessel', 'weapons', 'detection'];
    systems.forEach(sys => {
        const card = new SystemStatusCard(sys);
        normalContent.addChild(card);
        controller.registerVisual(`status_${sys}`, card);
    });

    // Register features with controller
    controller.features.set('damage', damageManager);
    controller.features.set('teletype', teletypeManager);

    sceneContent.on('destroyed', () => {
        damageManager.unmount();
        teletypeManager.unmount();
    });

    sceneContent.addChild(controlPanel);

    // --- Interrupt Coordinator ---
    // Non-visual coordinator swaps normalContent for interrupt panels
    const interruptCoordinator = new InterruptCoordinator(ticker, 'eng');
    interruptCoordinator.bindView(sceneContent);

    return sceneContent;
}

