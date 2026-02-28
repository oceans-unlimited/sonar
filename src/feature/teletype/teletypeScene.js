import { Container } from 'pixi.js';
import TerminalBox from './terminalBox.js';
import { createScrollBehavior } from './teletypeBehaviors.js';

/**
 * Builds the Teletype testing scene.
 * No hardcoded text — the scenario provides all content.
 */
export function createTeletypeScene(controller, ticker) {
    const sceneContent = new Container({
        label: 'teletypeScene',
        layout: {
            width: '100%',
            height: '100%',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
        }
    });

    const terminalBox = new TerminalBox({
        width: 400,
        height: 150,
        typingDelay: 30
    });
    
    // Wire up scroll behavior
    // We attach it to the controller so it can be cleaned up if needed, though
    // the scene destruction usually handles the view.
    const scrollBehavior = createScrollBehavior(terminalBox);
    
    // Store behavior on the box itself for easy access/debugging if needed
    terminalBox.behavior = scrollBehavior;

    // Cleanup hook when scene is destroyed (if sceneManager handles that)
    terminalBox.on('destroy', () => {
        scrollBehavior.destroy();
    });

    controller.registerVisual('terminal', terminalBox);
    sceneContent.addChild(terminalBox);

    return sceneContent;
}
