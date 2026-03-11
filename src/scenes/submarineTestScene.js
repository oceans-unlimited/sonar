import { Container } from 'pixi.js';
import Panel from '../render/panel';
import { Colors } from '../core/uiStyle';
import TerminalBox from '../feature/teletype/terminalBox';
import { createScrollBehavior } from '../feature/teletype/teletypeBehaviors';

/**
 * SubmarineTestScene
 * Diagnostic view for testing the Submarine View Model methods.
 * Uses a Teletype terminal to log the results of logic queries.
 */
export function createSubmarineTestScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'submarineTestScene';

    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: 40,
        gap: 20
    };

    // 1. Main Terminal Panel
    const panel = new Panel('control', {
        label: 'sub_diag_panel',
        headerText: 'Sub State',
        backgroundColor: Colors.background,
        borderColor: Colors.primary,
        showTab: true,
        padding: 20
    });

    Object.assign(panel.layout, {
        width: 600,
        height: 400,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    });

    // 2. Teletype Terminal
    const terminal = new TerminalBox({
        width: 540,
        height: 320,
        typingDelay: 20,
        maxRows: 15
    });

    // Wire up scroll behavior
    const scrollBehavior = createScrollBehavior(terminal);
    terminal.behavior = scrollBehavior;
    terminal.on('destroyed', () => scrollBehavior.destroy());

    // Register terminal so controller can push text to it
    controller.registerVisual('terminal', terminal);

    panel.addChild(terminal);
    sceneContent.addChild(panel);

    return sceneContent;
}
