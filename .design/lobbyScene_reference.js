// public/js/scenes/lobbyScene.js
//
// Cold-War console-style multiplayer lobby scene
// Responsive (landscape or stacked), modular, and testable
// Uses Orbitron Variable Font and terminal flicker/scanline effects

import * as PIXI from "pixi.js";
import { DOMContainer, Color } from "pixi.js";
import { Colors, Font, Layout } from "../core/uiStyle.js";
import {
  createNoiseOverlay,
  createScanlinesOverlay,
  applyFlickerEffect,
  applyGlowEffect,
} from "../core/uiEffects.js";
import { socketManager } from "../core/socketManager.js";

/*------------------------------------------------------------
  MAIN LOBBY SCENE
------------------------------------------------------------*/
export async function createLobbyScene(app, assets) {
  const root = new PIXI.Container();

  // --- Global background panel ---
  const bg = new PIXI.Graphics()
    .rect(0, 0, app.screen.width, app.screen.height)
    .fill({ color: Colors.background, alpha: 0.9 })
    .stroke({ color: Colors.border, width: 1 });
  root.addChild(bg);

  // --- Player name editor (top left) ---
  const playerName = new PIXI.Text({
    text: "Player-01",
    style: {
      fontFamily: Font.family,
      fontSize: 20,
      fill: Colors.text,
      letterSpacing: 1,
    },
  });
  playerName.x = 20;
  playerName.y = 20;
  root.addChild(playerName);

  // When the local player confirms a name change, send it to the server
  createEditableText(app, playerName, (newName) => {
    // Ensure socketManager is available and playerId matches
    try {
      if (window.socketManager && window.socketManager.playerId) {
        window.socketManager.changeName(newName);
      }
    } catch (e) {
      // fallback: nothing
    }
  });

  /*----------------------------------------------------------
    Layout containers
  ----------------------------------------------------------*/
  const container = new PIXI.Container();
  root.addChild(container);

  const colWidth = 300;
  const colSpacing = 16;

  // --- Create Sub A and Sub B panels ---
  const subA = createSubPanel("Sub A", Colors.subA, assets, "A", app);
  const subB = createSubPanel("Sub B", Colors.subB, assets, "B", app);

  // --- Unassigned Panel ---
  const unassigned = createUnassignedPanel(app, assets);

  container.addChild(subA, unassigned, subB);

  positionColumns(container, app.screen.width, colWidth, colSpacing);

  function updateLobby(state) {
    const allPlayers = [...state.players];
    const assignedPlayerIds = new Set();

    const clientPlayer = allPlayers.find(p => p.id === socketManager.playerId);
    if (clientPlayer) {
      playerName.text = clientPlayer.name;
    }

    // Map internal server role keys to UI display role names
    const internalToDisplay = {
      co: 'Captain',
      xo: '1st Officer',
      sonar: 'Sonar',
      eng: 'Engineer'
    };

    [subA, subB].forEach((sub, i) => {
      const subState = state.submarines[i];
      Object.keys(subState).forEach(internalRole => {
        const playerId = subState[internalRole];
        const displayRole = internalToDisplay[internalRole] || internalRole;
        if (playerId) {
          const player = allPlayers.find(p => p.id === playerId);
          if (player) player.ready = state.ready.includes(playerId);
          sub.assignPlayerToRole(displayRole, player);
          assignedPlayerIds.add(playerId);
        } else {
          sub.vacatePlayer(displayRole);
        }
      });
    });

    // Sort unassigned players by connectionOrder so Player-01, Player-02, ... order is preserved
    const unassignedPlayers = allPlayers
      .filter(p => !assignedPlayerIds.has(p.id))
      .sort((a, b) => (a.connectionOrder || 0) - (b.connectionOrder || 0));

    unassignedPlayers.forEach(p => p.ready = state.ready.includes(p.id));

    // Fill the unassigned panel slots (1..8) with the players in connection order
    if (typeof unassigned.setPlayers === 'function') {
      unassigned.setPlayers(unassignedPlayers);
    } else {
      unassigned.clearPlayers();
      unassignedPlayers.forEach(player => unassigned.addPlayer(player));
    }
  }

  socketManager.on('stateUpdate', updateLobby);

  // If socketManager already has a cached state, apply it immediately so the
  // lobby doesn't wait for a subsequent update (avoids race where scene subscribes
  // after an initial 'state' was received).
  try {
    if (socketManager.lastState) {
      // call async to avoid potential re-entrancy
      setTimeout(() => updateLobby(socketManager.lastState), 0);
    }
  } catch (e) {
    // ignore
  }

  root.on('destroyed', () => {
    socketManager.off('stateUpdate', updateLobby);
  });

  /*----------------------------------------------------------
    Global overlays & effects
  ----------------------------------------------------------*/

  const flickerCallback = applyFlickerEffect(app, [subA, unassigned, subB]);
  root.on("destroyed", () => app.ticker.remove(flickerCallback));

  /*----------------------------------------------------------
    Responsiveness
  ----------------------------------------------------------*/
  app.renderer.on("resize", () => {
    positionColumns(container, app.screen.width, colWidth, colSpacing);
  });

  return root;
}

/*------------------------------------------------------------
  SUB PANEL COMPONENT
------------------------------------------------------------*/
function createSubPanel(defaultName, outlineColor, assets, subId, app) {
  const panel = new PIXI.Container();
  panel.outlineColor = outlineColor;
  const width = 300;
  const height = 420;

  const border = new PIXI.Graphics()
    .rect(0, 0, width, height)
    .stroke({ color: outlineColor, width: 2 });
  panel.addChild(border);

  // --- Editable Sub Name ---
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

  createEditableText(app, nameField);

  // --- Sub profile image placeholder ---
  const subAssetName = subId === 'A' ? 'sub_profileA' : 'sub_profileB';
  const subTexture = assets[subAssetName] || PIXI.Texture.WHITE;
  const subImage = PIXI.Sprite.from(subTexture);
  subImage.width = width - 20;
  subImage.scale.y = subImage.scale.x;
  subImage.x = 10;
  subImage.y = 40;
  subImage.tint = outlineColor;
  panel.addChild(subImage);

  const noise = createNoiseOverlay(assets.noise, app, width, height);
  const scan = createScanlinesOverlay(assets.scanlines, app, width, height);
  panel.addChild(noise, scan);

  // --- Role slots ---
  const roles = ["Captain", "1st Officer", "Sonar", "Engineer"];
  const roleSlots = {};
  let offsetY = 130;
  for (const role of roles) {
    const slot = createRoleSlot(role, outlineColor, subId, assets, app);
    slot.x = 10;
    slot.y = offsetY;
    offsetY += 68;
    panel.addChild(slot);
    roleSlots[role] = slot;
  }

  // --- API for assignment ---
  panel.assignPlayerToRole = (role, player) => {
    const roleKey = role.toLowerCase().replace(' ', '');
    if (roleSlots[role]) {
      roleSlots[role].assignPlayer(player, roleKey, panel.outlineColor);
    }
  };
  panel.vacatePlayer = (role) => {
    if (roleSlots[role]) {
      roleSlots[role].vacate(role);
    }
  };

  return panel;
}

/*------------------------------------------------------------
  ROLE SLOT COMPONENT
------------------------------------------------------------*/
function createRoleSlot(role, outlineColor, subId, assets, app) {
  const container = new PIXI.Container();
  const width = 280;
  const height = 60;

  // Role button (placeholder rectangle; replace with SVG sprite)
  const roleAssetMap = {
    "Captain": "role_captain",
    "1st Officer": "role_firstofficer",
    "Sonar": "role_sonar",
    "Engineer": "role_engineer"
  };
  const assetName = roleAssetMap[role];
  const roleTexture = assets[assetName];
  const roleBtn = new PIXI.Sprite(roleTexture);
  roleBtn.width = 80;
  roleBtn.height = 50;
  roleBtn.x = 5;
  roleBtn.y = 5;
  roleBtn.accessible = true;
  roleBtn.accessibleTitle = role;
  roleBtn.accessibleHint = `Select the ${role} role`;
  container.addChild(roleBtn);

  let glowColor = Colors.roleEngineer; // Default or fallback
  if (role.includes("Captain")) glowColor = Colors.roleCaptain;
  else if (role.includes("Officer")) glowColor = Colors.roleXO;
  else if (role.includes("Sonar")) glowColor = Colors.roleSonar;

  const glowEffect = applyGlowEffect(roleBtn, app, glowColor);
  glowEffect.pulse();
  container.glowEffect = glowEffect;

  // Player nameplate
  const plate = createPlayerNameplate(null, outlineColor, glowEffect, role, true, assets, app);
  plate.x = 95;
  plate.y = 5;
  container.addChild(plate);

  roleBtn.eventMode = "static";
  roleBtn.cursor = "pointer";
  roleBtn.on("pointertap", () => {
    if (!plate.player) {
      const displayToInternal = {
        'Captain': 'co',
        '1st Officer': 'xo',
        'Sonar': 'sonar',
        'Engineer': 'eng'
      };
      const internalRole = displayToInternal[role] || role.toLowerCase().replace(' ', '');
      socketManager.selectRole(subId, internalRole);
    }
  });

  container.assignPlayer = (player, role, subColor) => plate.assignPlayer(player, role.toLowerCase().replace(' ', ''), subColor);
  container.vacate = (role) => plate.vacate(role);

  return container;
}

/*------------------------------------------------------------
  PLAYER NAMEPLATE COMPONENT
------------------------------------------------------------*/
function createPlayerNameplate(initialPlayer, textColor = Colors.text, glowEffect, role, isPlaceholder = false, assets, app) {
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

  // Ready toggle indicator
  const toggle = new PIXI.Sprite(assets.thumb);
  toggle.width = 25;
  toggle.height = 25;
  toggle.x = width - 25;
  toggle.y = height / 2 - 5;
  container.addChild(toggle);

  const thumbGlow = applyGlowEffect(toggle, app, 0x00ff00);
  thumbGlow.off();

  // Vacate button
  const vacateBtn = new PIXI.Text({
    text: "✖",
    style: { fontFamily: "Orbitron", fontSize: 16, fill: textColor },
  });
  vacateBtn.x = width - 20;
  vacateBtn.y = 3;
  vacateBtn.visible = false;
  container.addChild(vacateBtn);

  // By default, both toggle (ready indicator) and vacate button are hidden.
  toggle.visible = false;

  vacateBtn.eventMode = "static";
  vacateBtn.cursor = "pointer";
  vacateBtn.on("pointertap", () => {
    socketManager.leaveRole();
  });

  toggle.eventMode = "static";
  toggle.cursor = "pointer";
  toggle.on("pointertap", () => {
    if (container.player && container.player.id === socketManager.playerId) {
      // Toggle only for self
      container.player.ready = !container.player.ready;
      toggle.tint = container.player.ready ? 0x00ff00 : (container.player.id === socketManager.playerId ? Colors.background : subColor);
      if (container.player.ready) {
        thumbGlow.steadyOn();
        socketManager.ready();
      } else {
        thumbGlow.off();
        socketManager.notReady();
      }
    }
  });

  container.assignPlayer = (player, roleKey, subColor) => {
    container.player = player;
    nameText.text = player.name;

    // Show ready indicator and vacate only if this player is assigned to a role (roleKey truthy).
    const isAssigned = !!roleKey;
    toggle.visible = isAssigned;
    if (isAssigned) {
      toggle.tint = player.ready ? 0x00ff00 : (player.id === socketManager.playerId ? Colors.background : subColor);
      if (player.ready) {
        thumbGlow.steadyOn();
      } else {
        thumbGlow.off();
      }
    }

    // Vacate button visible only for the local (client) player when assigned.
    vacateBtn.visible = isAssigned && (player.id === socketManager.playerId);

    // Style change per role (robust handling of different roleKey formats)
    let roleColor = Colors.text;
    const rk = String(roleKey || '').toLowerCase();
    if (rk.includes('cap') || rk === 'co') roleColor = Colors.roleCaptain;
    else if (rk.includes('officer') || rk === 'xo') roleColor = Colors.roleXO;
    else if (rk.includes('sonar')) roleColor = Colors.roleSonar;
    else if (rk.includes('eng')) roleColor = Colors.roleEngineer;

    bg.clear();

    if (player.id === socketManager.playerId) { // Client player
      // Own player: filled background using Colors.text and no outline
      bg.roundRect(0, 0, width, height, 10).fill({ color: roleColor, alpha: 0.6 });
      nameText.style.fill = Colors.background;
      nameText.style.fontWeight = 'bold';
      // Ensure vacate button text matches this text color
      vacateBtn.style.fill = nameText.style.fill;
      if (glowEffect) glowEffect.steadyOn();
    } else { // Other players
      // For non-local assigned players, draw an outline matching the subColor
      bg.clear();
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
    // Reset background. If this is an unassigned placeholder, do not draw a border
    // so the parent container's border is visible through it.
    bg.clear();
    if (!isPlaceholder) {
      bg.roundRect(0, 0, width, height, 10).stroke({ color: Colors.border, width: 1 });
    }
    if (glowEffect) glowEffect.pulse();
  };

  return container;
}

/*------------------------------------------------------------
  UNASSIGNED PANEL
------------------------------------------------------------*/
function createUnassignedPanel(app, assets) {
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

  const noise = createNoiseOverlay(assets.noise, app, width, height);
  const scan = createScanlinesOverlay(assets.scanlines, app, width, height);
  panel.addChild(noise, scan);

  const scrollContainer = new PIXI.Container();
  scrollContainer.x = 10;
  scrollContainer.y = 40;
  panel.addChild(scrollContainer);

  let offsetY = 0;
  panel.addPlayer = (player) => {
    const plate = createPlayerNameplate(player, Colors.border, undefined, player.name, false, assets, app);
    plate.y = offsetY;
    scrollContainer.addChild(plate);
    offsetY += 60;
  };

  panel.clearPlayers = () => {
    // Remove all child plates and reset offset for fresh rendering
    scrollContainer.removeChildren();
    offsetY = 0;
  };

  // Create fixed 8 slots (placeholders). This keeps layout stable and allows clients
  // to fill the first available slots (1..8) deterministically.
  const slotHeight = 60;
  const maxSlots = 8;
  const slots = new Array(maxSlots).fill(null);
  for (let i = 0; i < maxSlots; i++) {
    // create an empty placeholder (no role label)
    const placeholder = createPlayerNameplate(null, Colors.border, undefined, null, true, assets, app);
    placeholder.y = i * slotHeight;
    scrollContainer.addChild(placeholder);
    slots[i] = placeholder;
  }

  // Replace the visible contents with the provided players filling slots 0..7
  panel.setPlayers = (players) => {
    // Clear existing plates but keep placeholders; we'll update placeholder contents
    players = players || [];
    for (let i = 0; i < maxSlots; i++) {
      const slotPlate = slots[i];
      if (players[i]) {
        // assign player to this slot
        slotPlate.assignPlayer(players[i], players[i].role || null, Colors.border);
      } else {
        // vacate to show placeholder (no border when it is a placeholder)
        slotPlate.vacate();
      }
    }
    // Ensure offsetY remains correct for any later addPlayer calls
    offsetY = maxSlots * slotHeight;
  };

  return panel;
}

/*------------------------------------------------------------
  LAYOUT HELPERS
------------------------------------------------------------*/
function positionColumns(container, screenWidth, colWidth, spacing) {
  const totalWidth = 3 * colWidth + 2 * spacing;
  let startX = (screenWidth - totalWidth) / 2;
  if (screenWidth < 768) {
    // Stack vertically
    let y = 80;
    container.children.forEach((c) => {
      c.x = (screenWidth - colWidth) / 2;
      c.y = y;
      y += 440;
    });
  } else {
    container.children.forEach((c, i) => {
      c.x = startX + i * (colWidth + spacing);
      c.y = 80;
    });
  }
}

/*------------------------------------------------------------
  EDITABLE TEXT COMPONENT
------------------------------------------------------------*/
function createEditableText(app, textObject, onConfirm) {
  textObject.eventMode = 'static';
  textObject.cursor = 'pointer';

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 15;
  input.style.position = 'absolute';
  input.style.display = 'none';
  input.style.fontFamily = textObject.style.fontFamily;
  input.style.fontSize = `${textObject.style.fontSize}px`;
  input.style.color = new PIXI.Color(textObject.style.fill).toRgbaString();
  input.style.backgroundColor = 'rgba(0,0,0,0.5)';
  input.style.border = '1px solid #28ee28';
  document.body.appendChild(input);

  const confirmBtn = document.createElement('button');
  confirmBtn.innerHTML = '✔';
  confirmBtn.style.position = 'absolute';
  confirmBtn.style.display = 'none';
  document.body.appendChild(confirmBtn);

  const startEditing = () => {
    textObject.visible = false;
    input.style.display = 'block';
    confirmBtn.style.display = 'block';

    const bounds = textObject.getGlobalPosition();
    const scale = textObject.worldTransform.a;
    input.style.top = `${bounds.y}px`;
    input.style.left = `${bounds.x}px`;
    input.style.width = `${textObject.width / scale}px`;
    input.value = textObject.text;
    input.focus();

    confirmBtn.style.top = `${bounds.y}px`;
    confirmBtn.style.left = `${bounds.x + textObject.width / scale + 5}px`;
  };

  const stopEditing = () => {
    const newVal = input.value;
    textObject.text = newVal;
    textObject.visible = true;
    input.style.display = 'none';
    confirmBtn.style.display = 'none';

    if (typeof onConfirm === 'function') {
      onConfirm(newVal);
    }
  };

  textObject.on('pointertap', startEditing);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      stopEditing();
    }
  });
  confirmBtn.addEventListener('click', stopEditing);
  input.addEventListener('blur', stopEditing);

  textObject.on('destroyed', () => {
    if (input.parentNode) {
      input.parentNode.removeChild(input);
    }
    if (confirmBtn.parentNode) {
      confirmBtn.parentNode.removeChild(confirmBtn);
    }
  });
}
