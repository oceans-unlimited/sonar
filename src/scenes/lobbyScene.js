import { Container, Text, Sprite, Assets } from 'pixi.js';
import { Colors, Fonts, Alphas } from '../core/uiStyle.js';
import Panel from '../render/panel.js';
import ButtonBlock from '../render/buttonBlock.js';
import { createButtonFromDef } from '../render/button.js';
import { wireButton } from '../behavior/buttonBehavior.js';
import { attachTextEditBehavior } from '../behavior/textEditBehavior.js';

/**
 * Lobby Scene Factory
 * Replaces the legacy LobbyRenderer and coordinates via SceneManager DI.
 */
export async function createLobbyScene(controller, ticker) {
    const sceneContent = new Container();
    sceneContent.label = "lobbyScene";

    // root layout properties moved here
    sceneContent.layout = {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 20,
    };

    const views = {
        playerName: null,
        subA: null,
        subB: null,
        unassigned: null,
        subNames: { A: null, B: null },
        roleSlots: { A: {}, B: {} }
    };

    // 1. Player Name (Absolutely positioned in upper left)
    views.playerName = new Text({
        text: "PLAYER-01",
        style: {
            fontFamily: Fonts.primary,
            fontSize: 20,
            fill: Colors.text,
            letterSpacing: 1
        }
    });
    views.playerName.layout = { position: 'absolute', left: 20, top: 20 };
    sceneContent.addChild(views.playerName);

    // 2. Helper for Sub Panels
    const createSubPanel = (subId, color) => {
        const panel = new Panel('lobby', {
            label: `panel_sub_${subId}`,
            headerText: `SUB ${subId}`,
            backgroundColor: color,
            borderColor: color,
            showTab: true
        });
        panel.setAlpha(Alphas.faint);

        // Submarine Icon
        const subAsset = subId === 'A' ? 'sub_profileA' : 'sub_profileB';
        const subTex = Assets.cache.get(subAsset);
        if (subTex) {
            const subImage = new Sprite(subTex);
            subImage.tint = color;
            subImage.layout = {
                width: '100%',
                maxHeight: 120,
                objectFit: 'contain',
                marginBottom: 15
            };
            panel.addChild(subImage);
        }

        const roles = [
            { id: 'co', label: 'Captain', asset: 'role_captain', color: Colors.roleCaptain },
            { id: 'xo', label: '1st Officer', asset: 'role_firstofficer', color: Colors.roleXO },
            { id: 'sonar', label: 'Sonar', asset: 'role_sonar', color: Colors.roleSonar },
            { id: 'eng', label: 'Engineer', asset: 'role_engineer', color: Colors.roleEngineer }
        ];

        roles.forEach(r => {
            const roleBtn = createButtonFromDef({
                asset: r.asset,
                profile: 'basic',
                canonicalLabel: `btn_${subId}_${r.id}`,
                constraint: 'height',
                targetSize: 60
            });

            const placeholderText = new Text({
                text: `<< ${r.label}`,
                style: { fontFamily: Fonts.primary, fontSize: 20, fill: r.color, letterSpacing: 1 },
                label: 'placeholderText'
            });
            placeholderText.layout = { marginLeft: 30, flexGrow: 4, objectPosition: 'left', display: 'flex' };

            // Role Slot Container (for nameplates)
            const roleSlot = new ButtonBlock([roleBtn, placeholderText], 'horizontal', {
                label: `slot_${subId}_${r.id}`,
                heading: r.label,
                header: false,
                line: false,
                color: color
            });
            // roleSlot.buttonRow.layout.gap = 0;

            // Wire Role Button
            const behavior = wireButton(roleBtn, {
                id: `role_${subId}_${r.id}`,
                onPress: () => controller.handleEvent('SELECT_ROLE', { 
                    subId, 
                    roleId: r.id, 
                    id: `btn_role_${subId}_${r.id}` 
                })
            });
            controller.registerButton(behavior.id, behavior);

            // Save references for controller
            views.roleSlots[subId][r.id] = {
                slotContainer: roleSlot,
                roleBtn: roleBtn,
                roleColor: r.color,
                // The roleSlot (ButtonBlock) itself is the target for nameplates
            };

            panel.addChild(roleSlot);
            controller.registerVisual(`slot_${subId}_${r.id}`, roleSlot);
        });

        return panel;
    };

    // 3. Build Columns
    views.subA = createSubPanel('A', Colors.subA);
    sceneContent.addChild(views.subA);
    views.subNames.A = views.subA.tabLabel;

    const unassignedOuter = new Panel('lobby', {
        label: 'panel_unassigned_outer',
        headerText: 'Unassigned',
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
        showTab: true
    });
    unassignedOuter.setAlpha(Alphas.faint);
    sceneContent.addChild(unassignedOuter);

    // Dynamic stack for player cards
    views.unassigned = new ButtonBlock([], 'stack', {
        label: 'panel_unassigned',
        header: false,
        line: false
    });
    unassignedOuter.addChild(views.unassigned);

    views.subB = createSubPanel('B', Colors.subB);
    sceneContent.addChild(views.subB);
    views.subNames.B = views.subB.tabLabel;

    // 4. Controller Bindings
    controller.setViews(views);

    // Attach Text Behaviors
    controller.behaviors.subNames.A = attachTextEditBehavior(views.subNames.A, {
        onConfirm: (newName) => controller.handleEvent('RENAME_SUB', { subId: 'A', name: newName, id: 'btn_sub_A_rename' }),
        maxLength: 12
    });
    controller.behaviors.subNames.B = attachTextEditBehavior(views.subNames.B, {
        onConfirm: (newName) => controller.handleEvent('RENAME_SUB', { subId: 'B', name: newName, id: 'btn_sub_B_rename' }),
        maxLength: 12
    });
    controller.behaviors.playerName = attachTextEditBehavior(views.playerName, {
        onConfirm: (newName) => controller.handleEvent('RENAME_PLAYER', { name: newName, id: 'btn_player_rename' }),
        maxLength: 12
    });

    // Final registrations
    controller.registerVisual('playerName', views.playerName);
    controller.registerVisual('panel_sub_A', views.subA);
    controller.registerVisual('panel_sub_B', views.subB);
    controller.registerVisual('panel_unassigned_outer', unassignedOuter);
    controller.registerVisual('panel_unassigned', views.unassigned);

    // Initial state check
    if (controller.lastState) {
        controller.onGameStateUpdate(controller.lastState);
    }

    return sceneContent;
}
