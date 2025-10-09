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
    text: "Player-001",
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

  createEditableText(app, playerName);

  /*----------------------------------------------------------
    Layout containers
  ----------------------------------------------------------*/
  const container = new PIXI.Container();
  root.addChild(container);

  const colWidth = 300;
  const colSpacing = 16;
  const subs = [];

  // --- Create Sub A and Sub B panels ---
  const subA = createSubPanel("Sub A", Colors.subA, assets, "A", app);
  const subB = createSubPanel("Sub B", Colors.subB, assets, "B", app);
  subs.push(subA, subB);

  // --- Unassigned Panel ---
  const unassigned = createUnassignedPanel();

  container.addChild(subA, unassigned, subB);

  positionColumns(container, app.screen.width, colWidth, colSpacing);

  /*----------------------------------------------------------
    Dummy data for debug
  ----------------------------------------------------------*/
  const dummyPlayers = [
    { id: 1, name: "Player-001", ready: false },
    { id: 2, name: "Player-002", ready: false },
    { id: 3, name: "Player-003", ready: false },
    { id: 4, name: "Player-004", ready: false },
  ];
  // Assign first two players to subs
  subA.assignPlayerToRole("Captain", dummyPlayers[0]);
  subB.assignPlayerToRole("Engineer", dummyPlayers[1]);
  // Remaining unassigned
  unassigned.addPlayer(dummyPlayers[2]);
  unassigned.addPlayer(dummyPlayers[3]);

  /*----------------------------------------------------------
    Global overlays & effects
  ----------------------------------------------------------*/
  const noise = createNoiseOverlay(assets.noise, app);
  const scan = createScanlinesOverlay(assets.scanlines, app);
  root.addChild(noise);
  root.addChild(scan);

  const flickerCallback = applyFlickerEffect(app, [playerName, subA, unassigned, subB]);
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
    if (roleSlots[role]) {
      roleSlots[role].assignPlayer(player);
    }
  };
  panel.vacatePlayer = (role) => {
    if (roleSlots[role]) {
      roleSlots[role].vacate();
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
  const plate = createPlayerNameplate(null, outlineColor, glowEffect);
  plate.x = 90;
  plate.y = 5;
  container.addChild(plate);

  roleBtn.eventMode = "static";
  roleBtn.cursor = "pointer";
  roleBtn.on("pointertap", () => {
    if (!plate.player) {
      // Assign this player locally for debug
      const newPlayer = { id: 999, name: "You", ready: false };
      plate.assignPlayer(newPlayer, role, outlineColor);
      // socket.emit('assignRole', { playerId: newPlayer.id, subId, role });
    }
  });

  container.assignPlayer = (player) => plate.assignPlayer(player, role, outlineColor);
  container.vacate = () => plate.vacate();

  return container;
}

/*------------------------------------------------------------
  PLAYER NAMEPLATE COMPONENT
------------------------------------------------------------*/
function createPlayerNameplate(initialPlayer, textColor = Colors.text, glowEffect) {
  const container = new PIXI.Container();
  const width = 180;
  const height = 50;

  const bg = new PIXI.Graphics()
    .rect(0, 0, width, height)
    .fill({ color: Colors.background, alpha: 0.4 })
    .stroke({ color: Colors.border, width: 1 });
  container.addChild(bg);

  const nameText = new PIXI.Text({
    text: initialPlayer ? initialPlayer.name : "Empty",
    style: {
      fontFamily: "Orbitron",
      fontSize: 14,
      fill: textColor,
    },
  });
  nameText.x = 8;
  nameText.y = 16;
  container.addChild(nameText);

  // Ready toggle indicator
  const toggle = new PIXI.Graphics().circle(width - 15, height / 2, 6);
  toggle.fill({ color: 0xff0000 });
  container.addChild(toggle);

  // Vacate button
  const vacateBtn = new PIXI.Text({
    text: "✖",
    style: { fontFamily: "Orbitron", fontSize: 14, fill: Colors.text },
  });
  vacateBtn.x = width - 30;
  vacateBtn.y = 14;
  vacateBtn.visible = false;
  container.addChild(vacateBtn);

  vacateBtn.eventMode = "static";
  vacateBtn.cursor = "pointer";
  vacateBtn.on("pointertap", () => {
    container.vacate();
    // socket.emit('vacateRole', { playerId: container.player.id });
  });

  toggle.eventMode = "static";
  toggle.cursor = "pointer";
  toggle.on("pointertap", () => {
    if (container.player && container.player.id === 999) {
      // Toggle only for self
      container.player.ready = !container.player.ready;
      toggle.clear();
      toggle.circle(width - 15, height / 2, 6);
      toggle.fill({ color: container.player.ready ? 0x00ff00 : 0xff0000 });
      // socket.emit('toggleReady', { ready: container.player.ready });
    }
  });

  container.assignPlayer = (player, role, subColor) => {
    container.player = player;
    nameText.text = player.name;
    vacateBtn.visible = true;
    toggle.clear().circle(width - 15, height / 2, 6);
    toggle.fill({ color: player.ready ? 0x00ff00 : 0xff0000 });

    // Style change per role
    let roleColor = Colors.roleEngineer;
    if (role.includes("Captain")) roleColor = Colors.roleCaptain;
    else if (role.includes("Officer")) roleColor = Colors.roleXO;
    else if (role.includes("Sonar")) roleColor = Colors.roleSonar;

    bg.clear().rect(0, 0, width, height);

    if (player.id === 999) { // Client player
      bg.fill({ color: roleColor, alpha: 0.6 });
      nameText.style.fill = Colors.background;
      container.scale.set(1.05);
      if (glowEffect) glowEffect.steadyOn();
    } else { // Other players
      bg.fill({ color: Colors.background, alpha: 0.4 });
      nameText.style.fill = subColor;
      container.scale.set(1.0);
      if (glowEffect) glowEffect.off();
    }
    bg.stroke({ color: subColor, width: 2 });
  };

  container.vacate = () => {
    container.player = null;
    nameText.text = "Empty";
    nameText.style.fill = textColor;
    vacateBtn.visible = false;
    bg.clear()
      .rect(0, 0, width, height)
      .fill({ color: Colors.background, alpha: 0.4 })
      .stroke({ color: Colors.border, width: 1 });
    if (glowEffect) glowEffect.pulse();
  };

  return container;
}

/*------------------------------------------------------------
  UNASSIGNED PANEL
------------------------------------------------------------*/
function createUnassignedPanel() {
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

  const scrollContainer = new PIXI.Container();
  scrollContainer.x = 10;
  scrollContainer.y = 40;
  panel.addChild(scrollContainer);

  let offsetY = 0;
  panel.addPlayer = (player) => {
    const plate = createPlayerNameplate(player, Colors.border, undefined);
    plate.y = offsetY;
    scrollContainer.addChild(plate);
    offsetY += 60;
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
function createEditableText(app, textObject) {
  textObject.eventMode = 'static';
  textObject.cursor = 'pointer';

  const input = document.createElement('input');
  input.type = 'text';
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
    textObject.text = input.value;
    textObject.visible = true;
    input.style.display = 'none';
    confirmBtn.style.display = 'none';
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
