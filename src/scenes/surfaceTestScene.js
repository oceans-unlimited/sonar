import { Container, Text } from 'pixi.js';
import Panel from '../render/panel';
import { createButtonFromDef } from '../render/button';
import { wireButton } from '../behavior/buttonBehavior';
import { Colors } from '../core/uiStyle';

/**
 * SurfaceTestScene
 * Interactive testbed for surfacing and repair sequences.
 */
export function createSurfaceTestScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'surfaceTestScene';

    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: 30
    };

    const panel = new Panel('control', {
        label: 'surface_test_panel',
        borderColor: Colors.primary,
        padding: 30
    });

    const title = new Text({
        text: 'SURFACE OPS TEST',
        style: { fontFamily: 'Courier New', fontSize: 24, fill: Colors.primary, fontWeight: 'bold' }
    });

    // Surface Button
    const surfaceBtn = createButtonFromDef({
        asset: 'vessel',
        color: Colors.primary,
        profile: 'frame'
    });

    const wiredSurface = wireButton(surfaceBtn, {
        id: 'req_surface_btn',
        event: 'REQUEST_SURFACE',
        preset: 'ACTION'
    }, (e, d) => controller.handleEvent(e, d), ticker);
    controller.registerButton('req_surface_btn', wiredSurface);

    const surfaceLabel = new Text({
        text: 'REQUEST SURFACE',
        style: { fontFamily: 'Courier New', fontSize: 14, fill: Colors.active }
    });

    // Submerge Button
    const submergeBtn = createButtonFromDef({
        asset: 'vessel',
        color: Colors.success,
        profile: 'frame'
    });

    const wiredSubmerge = wireButton(submergeBtn, {
        id: 'req_submerge_btn',
        event: 'REQUEST_SUBMERGE',
        preset: 'ACTION'
    }, (e, d) => controller.handleEvent(e, d), ticker);
    controller.registerButton('req_submerge_btn', wiredSubmerge);

    const submergeLabel = new Text({
        text: 'REQUEST SUBMERGE',
        style: { fontFamily: 'Courier New', fontSize: 14, fill: Colors.active }
    });

    panel.addChild(title, surfaceBtn, surfaceLabel, submergeBtn, submergeLabel);
    sceneContent.addChild(panel);

    return sceneContent;
}
