import * as PIXI from "pixi.js";
import { Colors, Font } from "../core/uiStyle.js";
import { applyGlowEffect } from "../ui/effects/glowEffect.js";
import { createNoiseOverlay, createScanlinesOverlay } from "../ui/effects/noiseOverlay.js";
import { attachEditableText } from "../ui/behaviors/editableText.js";

/**
 * Lobby Renderer
 * Handles visual construction of the lobby scene.
 * Preserves high-fidelity appearance of the original lobbyScene.js.
 */
export class LobbyRenderer {
    constructor(app, assets) {
        this.app = app;
        this.assets = assets;
        this.views = {
            subA: null,
            subB: null,
            unassigned: null,
            playerName: null
        };
    }

    render(parent) {
        const root = new PIXI.Container();
        parent.addChild(root);

        // 1. Background
        const bg = new PIXI.Graphics()
            .rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: Colors.background, alpha: 0.9 })
            .stroke({ color: Colors.border, width: 1 });
        root.addChild(bg);

        // 2. Player Name (Top Left)
        this.views.playerName = new PIXI.Text({
            text: "Player-01",
            style: {
                fontFamily: Font.family,
                fontSize: 20,
                fill: Colors.text,
                letterSpacing: 1,
            },
        });
        this.views.playerName.x = 20;
        this.views.playerName.y = 20;
        root.addChild(this.views.playerName);

        // 3. Main Container
        const container = new PIXI.Container();
        root.addChild(container);

        const colWidth = 300;
        const colSpacing = 16;

        const subA = this.createSubPanel("Sub A", Colors.subA, "A");
        const subB = this.createSubPanel("Sub B", Colors.subB, "B");
        const unassigned = this.createUnassignedPanel();

        this.views.subA = subA;
        this.views.subB = subB;
        this.views.unassigned = unassigned;

        container.addChild(subA, unassigned, subB);
        this.positionColumns(container, this.app.screen.width, colWidth, colSpacing);

        return {
            root,
            playerName: this.views.playerName,
            subA,
            subB,
            unassigned
        };
    }

    createSubPanel(defaultName, outlineColor, subId) {
        const panel = new PIXI.Container();
        const width = 300;
        const height = 420;

        const border = new PIXI.Graphics()
            .rect(0, 0, width, height)
            .stroke({ color: outlineColor, width: 2 });
        panel.addChild(border);

        const nameField = new PIXI.Text({
            text: defaultName,
            style: {
                fontSize: 18,
                fontFamily: "Orbitron",
                fill: outlineColor,
            },
        });
        nameField.x = 10;
        nameField.y = 8;
        panel.addChild(nameField);

        const subAssetName = subId === 'A' ? 'sub_profileA' : 'sub_profileB';
        const subTexture = this.assets[subAssetName] || PIXI.Texture.WHITE;
        const subImage = PIXI.Sprite.from(subTexture);
        subImage.width = width - 20;
        subImage.scale.y = subImage.scale.x;
        subImage.x = 10;
        subImage.y = 40;
        subImage.tint = outlineColor;
        panel.addChild(subImage);

        const noise = createNoiseOverlay(this.assets.noise, this.app, width, height);
        const scan = createScanlinesOverlay(this.assets.scanlines, this.app, width, height);
        panel.addChild(noise, scan);

        const roles = ["Captain", "1st Officer", "Sonar", "Engineer"];
        const roleSlots = {};
        let offsetY = 130;
        for (const role of roles) {
            const slot = this.createRoleSlot(role, outlineColor, subId);
            slot.x = 10;
            slot.y = offsetY;
            offsetY += 68;
            panel.addChild(slot);
            roleSlots[role] = slot;
        }

        panel.nameField = nameField;
        panel.roleSlots = roleSlots;
        panel.subId = subId;

        // View API
        panel.assignPlayerToRole = (role, player, selfPlayerId) => {
            if (roleSlots[role]) {
                roleSlots[role].assignPlayer(player, role, outlineColor, selfPlayerId);
            }
        };
        panel.vacatePlayer = (role) => {
            if (roleSlots[role]) {
                roleSlots[role].vacate(role);
            }
        };

        return panel;
    }

    createRoleSlot(role, outlineColor, subId) {
        const container = new PIXI.Container();
        const width = 280;
        const height = 60;

        const roleAssetMap = {
            "Captain": "role_captain",
            "1st Officer": "role_firstofficer",
            "Sonar": "role_sonar",
            "Engineer": "role_engineer"
        };
        const assetName = roleAssetMap[role];
        const roleTexture = this.assets[assetName];
        const roleBtn = new PIXI.Sprite(roleTexture);
        roleBtn.width = 80;
        roleBtn.height = 50;
        roleBtn.x = 5;
        roleBtn.y = 5;
        container.addChild(roleBtn);

        let glowColor = Colors.roleEngineer;
        if (role.includes("Captain")) glowColor = Colors.roleCaptain;
        else if (role.includes("Officer")) glowColor = Colors.roleXO;
        else if (role.includes("Sonar")) glowColor = Colors.roleSonar;

        const glowEffect = applyGlowEffect(roleBtn, this.app, glowColor);
        glowEffect.pulse();
        container.glowEffect = glowEffect;

        const plate = this.createPlayerNameplate(null, outlineColor, glowEffect, role, false);
        plate.x = 95;
        plate.y = 5;
        container.addChild(plate);

        container.roleBtn = roleBtn;
        container.plate = plate;
        container.subId = subId;
        container.role = role;

        container.assignPlayer = (player, displayRole, subColor, socketId) => plate.assignPlayer(player, displayRole, subColor, socketId);
        container.vacate = (role) => plate.vacate(role);

        return container;
    }

    createPlayerNameplate(initialPlayer, textColor, glowEffect, role, isPlaceholder) {
        const container = new PIXI.Container();
        const width = 180;
        const height = 50;

        const bg = new PIXI.Graphics();
        container.addChild(bg);

        const nameText = new PIXI.Text({
            text: initialPlayer ? initialPlayer.name : (role ? `<<< ${role}` : ''),
            style: {
                fontFamily: Font.family,
                fontSize: 15,
                fontWeight: 'normal',
                fill: textColor,
            },
        });
        nameText.x = 8;
        nameText.y = 16;
        container.addChild(nameText);

        const toggle = new PIXI.Sprite(this.assets.thumb);
        toggle.width = 25;
        toggle.height = 25;
        toggle.x = width - 25;
        toggle.y = height / 2 - 5;
        toggle.visible = false;
        container.addChild(toggle);

        const thumbGlow = applyGlowEffect(toggle, this.app, 0x00ff00);
        thumbGlow.off();

        const vacateBtn = new PIXI.Text({
            text: "✖",
            style: { fontFamily: "Orbitron", fontSize: 16, fill: textColor },
        });
        vacateBtn.x = width - 20;
        vacateBtn.y = 3;
        vacateBtn.visible = false;
        container.addChild(vacateBtn);

        container.nameText = nameText;
        container.toggle = toggle;
        container.vacateBtn = vacateBtn;
        container.thumbGlow = thumbGlow;

        container.assignPlayer = (player, displayRole, subColor, selfPlayerId) => {
            container.player = player;
            nameText.text = player.name;

            const isAssigned = !!displayRole;
            toggle.visible = isAssigned;
            if (isAssigned) {
                toggle.tint = player.ready ? 0x00ff00 : (player.id === selfPlayerId ? Colors.background : subColor);
                if (player.ready) thumbGlow.steadyOn();
                else thumbGlow.off();
            }

            vacateBtn.visible = isAssigned && (player.id === selfPlayerId);

            let roleColor = Colors.text;
            const rk = String(displayRole || '').toLowerCase();
            if (rk.includes('cap') || rk === 'co') roleColor = Colors.roleCaptain;
            else if (rk.includes('officer') || rk === 'xo') roleColor = Colors.roleXO;
            else if (rk.includes('sonar')) roleColor = Colors.roleSonar;
            else if (rk.includes('eng')) roleColor = Colors.roleEngineer;

            bg.clear();
            if (player.id === selfPlayerId) {
                bg.roundRect(0, 0, width, height, 10).fill({ color: roleColor, alpha: 0.6 });
                nameText.style.fill = Colors.background;
                nameText.style.fontWeight = 'bold';
                vacateBtn.style.fill = nameText.style.fill;
                if (glowEffect) glowEffect.steadyOn();
            } else {
                bg.roundRect(0, 0, width, height, 10).stroke({ color: subColor, width: 2 });
                nameText.style.fill = subColor;
                nameText.style.fontWeight = 'normal';
                if (glowEffect) glowEffect.off();
            }
        };

        container.vacate = (role) => {
            container.player = null;
            nameText.text = role ? `<<< ${role}` : '';
            nameText.style.fill = textColor;
            nameText.style.fontWeight = 'normal';
            vacateBtn.visible = false;
            toggle.visible = false;
            bg.clear();
            if (!isPlaceholder) {
                bg.roundRect(0, 0, width, height, 10).stroke({ color: Colors.border, width: 1 });
            }
            if (glowEffect) glowEffect.pulse();
        };

        // Initialize state
        if (initialPlayer) {
            container.assignPlayer(initialPlayer, role, textColor, null);
        } else {
            container.vacate(role);
        }

        return container;
    }

    createUnassignedPanel() {
        const panel = new PIXI.Container();
        const width = 300;
        const height = 420;

        const border = new PIXI.Graphics()
            .rect(0, 0, width, height)
            .stroke({ color: Colors.border, width: 2 });
        panel.addChild(border);

        const title = new PIXI.Text({
            text: "UNASSIGNED",
            style: {
                fontFamily: "Orbitron",
                fontSize: 18,
                fill: Colors.text,
            },
        });
        title.x = 10;
        title.y = 8;
        panel.addChild(title);

        const noise = createNoiseOverlay(this.assets.noise, this.app, width, height);
        const scan = createScanlinesOverlay(this.assets.scanlines, this.app, width, height);
        panel.addChild(noise, scan);

        const scrollContainer = new PIXI.Container();
        scrollContainer.x = 10;
        scrollContainer.y = 40;
        panel.addChild(scrollContainer);

        const slotHeight = 60;
        const maxSlots = 8;
        const slots = [];
        for (let i = 0; i < maxSlots; i++) {
            const placeholder = this.createPlayerNameplate(null, Colors.border, undefined, null, false);
            placeholder.y = i * slotHeight;
            scrollContainer.addChild(placeholder);
            slots.push(placeholder);
        }

        panel.setPlayers = (players, selfPlayerId) => {
            players = players || [];
            for (let i = 0; i < maxSlots; i++) {
                const slotPlate = slots[i];
                if (players[i]) {
                    slotPlate.assignPlayer(players[i], players[i].role || null, Colors.border, selfPlayerId);
                } else {
                    slotPlate.vacate();
                }
            }
        };

        return panel;
    }

    positionColumns(container, screenWidth, colWidth, spacing) {
        const totalWidth = 3 * colWidth + 2 * spacing;
        const startX = (screenWidth - totalWidth) / 2;

        container.children.forEach((c, i) => {
            c.x = startX + i * (colWidth + spacing);
            c.y = 80;
        });
    }
}
