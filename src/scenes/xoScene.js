/**
 * XO Scene Factory
 * Constructs the First Officer (XO) station's visual elements.
 * Uses Panel, SubsystemRow, and OOP-based layout.
 */

import { Container, Sprite, Text } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createButtonFromDef } from '../render/button';
import { SystemColors, Font, Colors } from '../core/uiStyle';
import { visuals } from '../render/effects/visuals';

/**
 * @param {import('pixi.js').Application} app
 * @param {object} assets
 * @param {import('../core/socketManager').socketManager} socketManager
 * @returns {Container}
 */
export async function createXOScene(app, assets, socketManager) {
    const scene = new Container();
    scene.label = 'xoScene';

    scene.layout = {
        width: app.screen.width,
        height: app.screen.height,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        padding: 20
    };

    const panelWidth = 320;
    const panelHeight = 450;

    // --- Data Definitions ---
    const columnConfigs = [
        {
            name: "Detection",
            color: SystemColors.detection,
            rows: [
                { key: 'sonar', label: "Active Sonar", icon: assets.ping_sys, gauge: assets.four_gauge, fills: [assets.four_gauge_fill1, assets.four_gauge_fill2, assets.four_gauge_fill3, assets.four_gauge_fill4] },
                { key: 'drone', label: "Drone", icon: assets.drone_sys, gauge: assets.three_gauge, fills: [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3] }
            ]
        },
        {
            name: "Weapons",
            color: SystemColors.weapons,
            rows: [
                { key: 'mine', label: "Mine", icon: assets.mine_sys, gauge: assets.three_gauge, fills: [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3] },
                { key: 'torpedo', label: "Torpedo", icon: assets.torpedo_sys, gauge: assets.three_gauge, fills: [assets.three_gauge_fill1, assets.three_gauge_fill2, assets.three_gauge_fill3] }
            ]
        },
        {
            name: "Vessel",
            color: SystemColors.stealth,
            rows: [
                { key: 'silence', label: "Silent Running", icon: assets.stealth_sys, gauge: assets.six_gauge, fills: [assets.six_gauge_fill1, assets.six_gauge_fill2, assets.six_gauge_fill3, assets.six_gauge_fill4, assets.six_gauge_fill5, assets.six_gauge_fill6] },
                { key: 'scenario', label: "Scenario", icon: assets.scenario_sys, gauge: assets.four_gauge, fills: [assets.four_gauge_fill1, assets.four_gauge_fill2, assets.four_gauge_fill3, assets.four_gauge_fill4] }
            ]
        }
    ];

    scene._rows = new Map();

    // --- Build Panels ---
    columnConfigs.forEach(col => {
        const panel = new Panel('control', {
            label: `panel_${col.name.toLowerCase()}`,
            backgroundColor: null,
            borderColor: col.color,
            borderWidth: 4,
            padding: 15
        });

        panel.layout = {
            width: 'auto',
            height: 'auto',
            flexDirection: 'column',
            gap: 20
        };

        col.rows.forEach(rowData => {
            // 1. Create Subsystem Button (Icon)
            const iconBtn = createButtonFromDef({
                asset: rowData.icon,
                profile: 'basic',
                color: col.color
            });

            // 2. Create Gauge Button
            const gaugeBtn = createButtonFromDef({
                id: `${rowData.key}_gauge`,
                asset: rowData.gauge,
                profile: 'basic',
                color: col.color
            });

            // 3. Add Fills to Gauge Button
            const fillSprites = rowData.fills.map((texture, index) => {
                const fill = new Sprite(texture);
                fill.anchor.set(0.5);
                fill.scale.set(0.9); // Slight scale to fit inside button
                fill.visible = false;
                fill.eventMode = 'none';
                gaugeBtn.addChild(fill);
                return fill;
            });

            // 4. Status Text
            const statusText = new Text({
                text: "READY",
                style: {
                    fontFamily: Font.family,
                    fontSize: 13,
                    fontWeight: 'bold',
                    fill: col.color
                }
            });
            statusText.label = 'statusText';
            statusText.visible = false;
            statusText.eventMode = 'none';
            // Position status text roughly next to the buttons
            statusText.layout = {
                marginLeft: 10,
                alignSelf: 'center'
            };

            // 5. Create ButtonBlock
            const row = new ButtonBlock([iconBtn, gaugeBtn, statusText], 'horizontal', {
                label: `row_${rowData.key}`,
                heading: rowData.label,
                header: true,
                line: true,
                color: col.color
            });

            // Add lifecycle methods to row for controller compatibility
            row.setLevel = (level) => {
                fillSprites.forEach((sprite, index) => {
                    sprite.visible = index < level;
                    if (sprite.visible) visuals.setTint(sprite, col.color);
                });
                const isFull = level >= rowData.fills.length;
                statusText.visible = isFull;

                // Interaction state (managed by controller but we can handle visual state here if needed)
                // Actually, the controller handles alpha and cursor on the row.
            };

            // Custom setTint for cascading to new elements
            const originalSetTint = row.setTint.bind(row);
            row.setTint = (newColor) => {
                originalSetTint(newColor);
                visuals.setTint(statusText, newColor);
                fillSprites.forEach(s => visuals.setTint(s, newColor));
            };

            // Interaction wiring
            iconBtn.on('pointerdown', () => {
                if (scene._controller) {
                    scene._controller.handleEvent('CHARGE_SUBSYSTEM', { key: rowData.key });
                }
            });

            panel.addChild(row);
            scene._rows.set(rowData.key, row);

            // Register with controller if bound
            if (scene._controller) {
                scene._controller.registerVisual(`row_${rowData.key}`, row);
            }
        });

        scene.addChild(panel);
    });

    return scene;
}
