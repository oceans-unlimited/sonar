/**
 * XO Scene Factory
 * Constructs the First Officer (XO) station's visual elements.
 * Uses Panel, SubsystemRow, and OOP-based layout.
 */

import { Container, Text } from 'pixi.js';
import Panel from '../render/panel';
import ButtonBlock from '../render/buttonBlock';
import { createButtonFromDef } from '../render/button';
import { SystemColors, Fonts, Alphas } from '../core/uiStyle';
import { wireButton } from '../behavior/buttonBehavior.js';

/**
 * @param {Object} controller - The active SceneController instance.
 * @param {import('pixi.js').Ticker} ticker - The application ticker.
 * @returns {Container} The constructed scene container.
 */
export async function createXOScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = 'xoScene';

    sceneContent.layout = {
        width: '80%',
        height: 'auto',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 20,
    };

    // --- Data Definitions ---
    const columnConfigs = [
        {
            name: "Detection",
            color: SystemColors.detection,
            rows: [
                { key: 'sonar', label: "Active Sonar", icon: 'ping_sys', frames: ['gauge_04.png', 'gauge_25.png', 'gauge_50.png', 'gauge_75.png', 'gauge_100.png'] },
                { key: 'drone', label: "Drone", icon: 'drone_sys', frames: ['gauge_03.png', 'gauge_33.png', 'gauge_66.png', 'gauge_100.png'] }
            ]
        },
        {
            name: "Weapons",
            color: SystemColors.weapons,
            rows: [
                { key: 'mine', label: "Mine", icon: 'mine_sys', frames: ['gauge_03.png', 'gauge_33.png', 'gauge_66.png', 'gauge_100.png'] },
                { key: 'torpedo', label: "Torpedo", icon: 'torpedo_sys', frames: ['gauge_03.png', 'gauge_33.png', 'gauge_66.png', 'gauge_100.png'] }
            ]
        },
        {
            name: "Vessel",
            color: SystemColors.vessel,
            rows: [
                { key: 'silence', label: "Silent Running", icon: 'stealth_sys', frames: ['gauge_06.png', 'gauge_16.png', 'gauge_06_33.png', 'gauge_06_50.png', 'gauge_06_66.png', 'gauge_82.png', 'gauge_100.png'] },
                { key: 'scenario', label: "Scenario", icon: 'scenario_sys', frames: ['gauge_05.png', 'gauge_20.png', 'gauge_40.png', 'gauge_60.png', 'gauge_80.png', 'gauge_100.png'] }
            ]
        }
    ];

    sceneContent._rows = new Map();

    // --- Build Panels ---
    columnConfigs.forEach(col => {
        const panel = new Panel('control', {
            label: `panel_${col.name.toLowerCase()}`,
            backgroundColor: col.color,
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

        panel.setAlpha(Alphas.faint);

        col.rows.forEach(rowData => {
            // 1. Create Subsystem Button (Icon)
            const systemBtn = createButtonFromDef({
                asset: rowData.icon,
                profile: 'basic',
                color: col.color
            });

            // 2. Create Gauge Button
            const gaugeBtn = createButtonFromDef({
                asset: rowData.frames[0] || 'four_gauge',
                profile: 'basic',
                color: col.color
            });

            // 4. Status Text
            const statusText = new Text({
                text: "READY",
                style: {
                    fontFamily: Fonts.primary,
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

            // 4. Create ButtonBlock
            const row = new ButtonBlock([systemBtn, gaugeBtn, statusText], 'horizontal', {
                label: `row_${rowData.key}`,
                heading: rowData.label,
                header: true,
                line: true,
                color: col.color
            });

            // 5. Standardized Wiring (ACTION Preset)
            const iconBehavior = wireButton(
                systemBtn, {
                id: `${rowData.key}_system`,
                profile: 'basic',
                onPress: () => controller.handleEvent('CHARGE_SUBSYSTEM', { id: `${rowData.key}_system`, key: rowData.key })
            });
            controller.registerButton(iconBehavior.id, iconBehavior);

            const gaugeBehavior = wireButton(
                gaugeBtn, {
                id: `${rowData.key}_gauge`,
                profile: 'basic',
                onPress: () => controller.handleEvent('CHARGE_SUBSYSTEM', { id: `${rowData.key}_gauge`, key: rowData.key })
            });
            controller.registerButton(gaugeBehavior.id, gaugeBehavior);

            // Add lifecycle methods to row for controller compatibility
            row.setGaugeLevel = (level) => {
                const texture = rowData.frames[level];
                console.log(`[xoScene] Setting gauge level for ${rowData.key}: ${level} (texture: ${texture})`);
                if (texture) gaugeBtn.setAsset(texture);

                const isFull = level >= (rowData.frames.length - 1) && level > 0;
                statusText.visible = isFull;
            };

            row.setInteractiveState = (canInteract) => {
                iconBehavior.setEnabled(canInteract);
                gaugeBehavior.setEnabled(canInteract);
                row.alpha = canInteract ? 1.0 : 0.6;
            };

            // Custom setTint for cascading
            const originalSetTint = row.setTint.bind(row);
            row.setTint = (newColor) => {
                originalSetTint(newColor);
                if (statusText.style) statusText.style.fill = newColor;
            };

            panel.addChild(row);
            sceneContent._rows.set(rowData.key, row);

            // Register with controller if bound
            if (controller) {
                controller.registerVisual(`row_${rowData.key}`, row);
            }
        });

        sceneContent.addChild(panel);
    });

    return sceneContent;
}
