import { SYSTEM_ASSETS } from '../core/uiStyle.js';
import { Container, Text } from 'pixi.js';
import { createButtonFromDef } from '../render/button.js';
import ButtonBlock from '../render/buttonBlock.js';
import { wireButton } from '../behavior/buttonBehavior.js';

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
        flexDirection: 'column',
        // gap: 20,
        justifyContent: 'space-between',
        // alignItems: 'baseline',
    };

    const loadingText = new Text({
        text: 'Awaiting initial state from server...',
        style: {
            fontFamily: 'Courier New',
            fontSize: 18,
            fill: '#00ff00',
            align: 'center',
        }
    });
    loadingText.anchor.set(0.5);
    sceneContent.addChild(loadingText);

    /**
     * Populates the scene with content once the initial layout is received.
     * @param {Object} initialLayout - The engine layout data from the server.
     */
    sceneContent.populate = (initialLayout) => {
        // Remove loading message
        sceneContent.removeChild(loadingText);
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

            // Create Single Block
            const blockConfig = {
                heading: dirKey, // N, E, S, W
                label: `block_${dirKey.toLowerCase()}`, // Selector ID
                color: '#FFFFFF', // Default white for text/headers
                header: true,
                line: true
            };
            const block = new ButtonBlock(blockButtons, 'horizontal', blockConfig);
            sceneContent.addChild(block);
        });
    };

    return sceneContent;
}