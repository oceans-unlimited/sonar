import { BaseController } from './baseController.js';
import { PlayerNamePlate } from '../render/card.js';
import { Colors } from '../core/uiStyle.js';
import { wireButton } from '../behavior/buttonBehavior.js';

export class LobbyController extends BaseController {
    constructor() {
        super();
        this.views = null;
        this.playerCards = new Map(); // Maps playerId to PlayerNamePlate instance
        this.behaviors = {
            subNames: { A: null, B: null },
            playerName: null
        };

        // Add action mapping for lobby events
        this.handlers['SELECT_ROLE'] = (payload) => {
            this.requestRoleSelection(payload.subId, payload.roleId);
        };
        this.handlers['TOGGLE_READY'] = (payload) => {
            this.requestToggleReady();
        };
        this.handlers['VACATE'] = (payload) => {
            this.requestVacate();
        };
        this.handlers['RENAME_PLAYER'] = (payload) => {
            this.requestNameChange(payload.name);
        };
        this.handlers['RENAME_SUB'] = (payload) => {
            this.requestSubRename(payload.subId, payload.name);
        };
    }

    setViews(views) {
        this.views = views;
        // If state arrived before views were bound, trigger it now
        if (this.lastState) {
            this.onGameStateUpdate(this.lastState);
        }
    }

    destroy() {
        console.log("[LobbyController] Destroying...");
        this.playerCards.forEach(card => card.destroy());
        this.playerCards.clear();
        super.destroy();
    }

    onGameStateUpdate(state) {
        if (!state || !this.views) return;
        const selfPlayerId = this.socket ? this.socket.playerId : null;
        
        // 0. Update submarine names
        state.submarines.forEach((subState, i) => {
            const subId = i === 0 ? 'A' : 'B';
            const label = this.views.subNames[subId];
            if (label && subState.name) {
                label.text = subState.name;
            }
        });

        // 1. Reconcile Players (Create cards for new players, delete disconnected)
        const currentIds = new Set(state.players.map(p => p.id));
        
        // Remove old
        for (const [id, card] of this.playerCards.entries()) {
            if (!currentIds.has(id)) {
                this.unregisterButton(`ready_${id}`);
                this.unregisterButton(`vacate_${id}`);
                card.destroy();
                this.playerCards.delete(id);
            }
        }

        // Add or grab existing
        const activeCards = [];
        state.players.forEach(playerData => {
            let card = this.playerCards.get(playerData.id);
            if (!card) {
                card = new PlayerNamePlate(playerData);
                const isSelf = playerData.id === selfPlayerId;

                // Wire Buttons for Self interaction
                if (isSelf) {
                    const readyApi = wireButton(card.readyIcon, {
                        id: `ready_${playerData.id}`,
                        onPress: () => {
                            // Can't toggle ready if not assigned
                            const amIAssigned = state.submarines.some(sub => 
                                ['co', 'xo', 'sonar', 'eng'].some(role => sub[role] === selfPlayerId)
                            );
                            if (amIAssigned) {
                                this.handleEvent('TOGGLE_READY', { id: `ready_${playerData.id}` });
                            }
                        }
                    });
                    this.registerButton(readyApi.id, readyApi);

                    const vacateApi = wireButton(card.vacateBtn, {
                        id: `vacate_${playerData.id}`,
                        profile: 'tag',
                        onPress: () => {
                            this.handleEvent('VACATE', { id: `vacate_${playerData.id}` });
                        }
                    });
                    this.registerButton(vacateApi.id, vacateApi);
                }

                this.playerCards.set(playerData.id, card);
                
                // Register as visual for color control and effects
                this.registerVisual(card.label, card);
            }

            // Sync mechanical ready states
            const isReady = state.ready.includes(playerData.id);
            const readyApi = this.buttons.get(`ready_${playerData.id}`);
            if (readyApi) {
                readyApi.setActive(isReady);
                card.readyIcon.visible = true; // Ensure visible for self
            } else {
                card.setReady(isReady);
            }
            activeCards.push({ data: playerData, card });
        });

        // Track who ends up assigned so we can dump the rest into unassigned
        const assignedIds = new Set();

        // 2. Mount assigned cards into their exact Submarine slots
        state.submarines.forEach((subState, i) => {
            const subId = i === 0 ? 'A' : 'B';
            const subColor = i === 0 ? Colors.subA : Colors.subB;
            
            // Map the internal roles to the UI slots
            const roles = ['co', 'xo', 'sonar', 'eng'];
            roles.forEach(roleId => {
                const playerId = subState[roleId];
                const slotView = this.views.roleSlots[subId][roleId];
                if (!slotView) return;

                // Clear whatever old card was in this slot (it's a ButtonBlock, second child is the placeholder/card)
                const slotContainer = slotView.slotContainer;
                // ButtonBlock elements: [button, content]
                // We want to replace or update the content
                
                if (playerId) {
                    const cardData = activeCards.find(c => c.data.id === playerId);
                    if (cardData) {
                        const card = cardData.card;
                        const isSelf = playerId === selfPlayerId;

                        // Use new ButtonBlock methods for cleaner card placement
                        slotContainer.addContent(card);
                        slotContainer.toggleContentVisibility('placeholderText', false);

                        const roleColor = slotView.roleColor;
                        card.updateStyle(true, subColor, isSelf, roleColor);
                        card.setVacateVisible(isSelf);
                        card.visible = true;

                        assignedIds.add(playerId);
                    }
                } else {
                    slotContainer.toggleContentVisibility('placeholderText', true);
                }
            });
        });

        // 3. Mount all others into Unassigned Green Column
        const unassignedPanel = this.views.unassigned;
        
        activeCards.filter(c => !assignedIds.has(c.data.id))
            .sort((a, b) => (a.data.connectionOrder || 0) - (b.data.connectionOrder || 0))
            .forEach(({ card }) => {
                unassignedPanel.addContent(card);
                card.updateStyle(false, Colors.border, false); // Standard unassigned style
                card.visible = true;
            });

        // 4. Update Editing Permissions
        this._updateEditingPermissions(state, selfPlayerId);
    }

    _updateEditingPermissions(state, selfId) {
        if (!state || !selfId) return;

        // A player is CO if subState.co === selfId
        const isCO_A = state.submarines[0]?.co === selfId;
        const isCO_B = state.submarines[1]?.co === selfId;

        if (this.behaviors.subNames.A) {
            this.behaviors.subNames.A.setEnabled(isCO_A);
            this.views.subNames.A.cursor = isCO_A ? 'pointer' : 'default';
        }
        if (this.behaviors.subNames.B) {
            this.behaviors.subNames.B.setEnabled(isCO_B);
            this.views.subNames.B.cursor = isCO_B ? 'pointer' : 'default';
        }

        // Player name editing is always enabled for the client
        if (this.behaviors.playerName) {
            this.behaviors.playerName.setEnabled(true);
        }
    }

    // --- Intents ---
    requestNameChange(newName) {
        console.log(`[LobbyController] Requesting Name Change: ${newName}`);
        if (this.socket) this.socket.changeName(newName.trim());
    }

    requestSubRename(subId, newName) {
        console.log(`[LobbyController] Requesting Sub ${subId} Rename: ${newName}`);
        // Canonical command for submarine rename
        if (this.socket) this.socket.emit('renameSub', { subId, name: newName.trim() });
    }

    requestRoleSelection(subId, roleId) {
        if (this.lastState) {
            const subIndex = subId === 'A' ? 0 : 1;
            const sub = this.lastState.submarines[subIndex];
            if (sub && sub[roleId]) {
                console.warn(`[LobbyController] Role ${roleId} is occupied!`);
                return;
            }
        }
        console.log(`[LobbyController] Requesting Role: ${roleId} on Sub ${subId}`);
        if (this.socket) this.socket.selectRole(subId, roleId);
    }

    requestVacate() {
        console.log("[LobbyController] Requesting Vacate");
        if (this.socket) this.socket.leaveRole();
    }

    requestToggleReady() {
        if (!this.lastState || !this.socket) return;
        const selfId = this.socket.playerId;
        const isReady = this.lastState.ready.includes(selfId);
        if (isReady) this.socket.notReady();
        else this.socket.ready();
    }
}
