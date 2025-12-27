// public/js/scenes/lobbyScene.js
import * as PIXI from "pixi.js";
import { LobbyRenderer } from "../renderers/lobbyRenderer.js";
import { LobbyController } from "../controllers/lobbyController.js";
import { applyFlickerEffect } from "../ui/effects/flickerEffect.js";
import { attachEditableText } from "../ui/behaviors/editableText.js";

/**
 * Lobby Scene (Lifecycle Orchestration)
 * Thin shell that wires visuals to inputs and forwards intent to the controller.
 */
export async function createLobbyScene(app, assets) {
  const scene = new PIXI.Container();

  // 1. Initialize Renderer
  const renderer = new LobbyRenderer(app, assets);
  const view = renderer.render(scene);

  // 2. Initialize Controller
  const controller = new LobbyController(app, renderer);
  controller.init();

  // 3. Attach Input Behaviors (Intent Forwarding)

  // Player Name Edit
  attachEditableText(app, view.playerName, (newName) => {
    controller.requestNameChange(newName);
  });

  // Sub Names Edit
  [view.subA, view.subB].forEach(subPanel => {
    attachEditableText(app, subPanel.nameField, (newName) => {
      controller.requestSubRename(subPanel.subId, newName);
    });
  });

  // Role Selection & Ready Toggle
  [view.subA, view.subB].forEach(subPanel => {
    Object.entries(subPanel.roleSlots).forEach(([roleName, slot]) => {
      // Role Button -> Request Selection
      slot.roleBtn.eventMode = 'static';
      slot.roleBtn.cursor = 'pointer';
      slot.roleBtn.on('pointertap', () => {
        controller.requestRoleSelection(subPanel.subId, roleName);
      });

      // Ready Toggle -> Request Toggle
      slot.plate.toggle.eventMode = 'static';
      slot.plate.toggle.cursor = 'pointer';
      slot.plate.toggle.on('pointertap', () => {
        controller.requestToggleReady();
      });

      // Vacate Button -> Request Vacate
      slot.plate.vacateBtn.eventMode = 'static';
      slot.plate.vacateBtn.cursor = 'pointer';
      slot.plate.vacateBtn.on('pointertap', () => {
        controller.requestVacate();
      });
    });
  });

  // 4. Visual Effects
  const flickerCallback = applyFlickerEffect(app, [view.subA, view.unassigned, view.subB]);

  // 5. Cleanup
  scene.on("destroyed", () => {
    app.ticker.remove(flickerCallback);
    controller.destroy();
  });

  return scene;
}
