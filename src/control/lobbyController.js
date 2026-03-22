import { BaseController } from './baseController.js';
import { PlayerNamePlate } from '../render/card.js';
import { Colors } from '../core/uiStyle.js';
import { wireButton } from '../behavior/buttonBehavior.js';

export class LobbyController extends BaseController {
    constructor() {
        super();
        this.views = null;
        this.playerToNameplate = new Map(); // playerId → nameplate instance
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
        this.playerToNameplate.clear();
        super.destroy();
    }

    /**
     * Get or create nameplate for a player
     * Reuses existing nameplate if player already mapped, else grabs from pool
     */
    _getOrCreateNameplate(playerId) {
        // Check if player already has a nameplate
        if (this.playerToNameplate.has(playerId)) {
            return this.playerToNameplate.get(playerId);
        }

        // Get next available (hidden) nameplate from pool
        const nameplatePool = this.views?.nameplatePool || [];
        let nameplate = nameplatePool.find(n => !n.visible);

        if (!nameplate) {
            console.warn(`[LobbyController] Nameplate pool exhausted, creating new instance`);
            nameplate = new PlayerNamePlate({});
        }

        return nameplate;
    }

    /**
     * Update nameplate data without re-wiring
     */
    _updateNameplateData(nameplate, playerData) {
        nameplate.playerId = playerData.id;
        nameplate.playerName = playerData.name;
        nameplate.nameText.text = playerData.name.toUpperCase();
        nameplate.label = `player_card_${playerData.id}`;
    }

    /**
     * Wire interactive buttons (ready + vacate) for self only
     */
    _wireInteractiveButtons(nameplate, playerData, state, selfPlayerId) {
        const isSelf = playerData.id === selfPlayerId;
        if (!isSelf) {
            // Hide interactive buttons for other players
            nameplate.readyIcon.visible = true; // Show as read-only indicator
            nameplate.vacateBtn.visible = false; // Hide vacate for others
            return;
        }

        // Wire ready button for self
        const readyApi = wireButton(nameplate.readyIcon, {
            id: `ready_${playerData.id}`,
            onPress: () => {
                console.log(`[LobbyController] Toggling Ready for player ${playerData.id}`);
                const amIAssigned = state.submarines.some(sub => 
                    ['co', 'xo', 'sonar', 'eng'].some(role => sub[role] === selfPlayerId)
                );
                if (amIAssigned) {
                    this.handleEvent('TOGGLE_READY', { id: `ready_${playerData.id}` });
                } else {
                    console.warn('[LobbyController] Cannot toggle ready: not assigned to role');
                }
            }
        });
        this.registerButton(readyApi.id, readyApi);

        // Wire vacate button for self
        const vacateApi = wireButton(nameplate.vacateBtn, {
            id: `vacate_${playerData.id}`,
            profile: 'tag',
            onPress: () => {
                console.log(`[LobbyController] Vacating role for player ${playerData.id}`);
                this.handleEvent('VACATE', { id: `vacate_${playerData.id}` });
            }
        });
        this.registerButton(vacateApi.id, vacateApi);
    }

    /**
     * Reset nameplate to unrendered state (for disconnects)
     */
    _resetNameplate(nameplate, playerId) {
        console.log(`[LobbyController] Resetting nameplate for ${playerId}`);
        
        // Hide and unassign
        nameplate.visible = false;
        nameplate.playerId = null;
        nameplate.playerName = 'Unknown';
        nameplate.nameText.text = 'Empty';
        
        // Unregister buttons
        this.unregisterButton(`ready_${playerId}`);
        this.unregisterButton(`vacate_${playerId}`);
        
        // Remove from parent containers
        if (nameplate.parent) {
            nameplate.parent.removeChild(nameplate);
        }
        
        // Remove mapping
        this.playerToNameplate.delete(playerId);
        this.unregisterVisual(`nameplate_${playerId}`);
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

        // 1. **HANDLE DISCONNECTS: Remove players no longer in state**
        const currentPlayerIds = new Set(state.players.map(p => p.id));
        for (const [playerId, nameplate] of this.playerToNameplate.entries()) {
            if (!currentPlayerIds.has(playerId)) {
                console.log(`[LobbyController] Player ${playerId} disconnected`);
                this._resetNameplate(nameplate, playerId);
            }
        }

        // 2. **MAP players array to nameplates and positions**
        const activeNameplates = [];
        
        state.players.forEach((playerData) => {
            // Get or create nameplate for this player
            let nameplate = this._getOrCreateNameplate(playerData.id);
            
            // First-time assignment: wire buttons and register
            if (!this.playerToNameplate.has(playerData.id)) {
                console.log(`[LobbyController] New/reconnected player: ${playerData.name} (${playerData.id})`);
                this._updateNameplateData(nameplate, playerData);
                this._wireInteractiveButtons(nameplate, playerData, state, selfPlayerId);
                this.playerToNameplate.set(playerData.id, nameplate);
                this.registerVisual(`nameplate_${playerData.id}`, nameplate);
            } else {
                // Existing player: just update data
                this._updateNameplateData(nameplate, playerData);
            }

            // Show nameplate
            nameplate.visible = true;
            activeNameplates.push({ data: playerData, nameplate });
        });

        // 3. **SYNC READY STATE for all visible nameplates**
        activeNameplates.forEach(({ data: playerData, nameplate }) => {
            const isSelf = playerData.id === selfPlayerId;
            const isReady = state.ready.includes(playerData.id);
            
            // Update ready indicator
            const readyApi = this.buttons.get(`ready_${playerData.id}`);
            if (readyApi) {
                readyApi.setActive(isReady);
                nameplate.readyIcon.visible = true;
            } else {
                // For other players, show read-only ready state
                nameplate.setReady(isReady);
                nameplate.readyIcon.visible = true;
            }
        });

        // Track assigned vs unassigned
        const assignedIds = new Set();

        // 4. **POSITION: Mount assigned players into submarine role slots**
        state.submarines.forEach((subState, i) => {
            const subId = i === 0 ? 'A' : 'B';
            const subColor = i === 0 ? Colors.subA : Colors.subB;
            const roles = ['co', 'xo', 'sonar', 'eng'];

            roles.forEach(roleId => {
                const playerId = subState[roleId];
                const slotView = this.views.roleSlots[subId][roleId];
                if (!slotView) return;

                const slotContainer = slotView.slotContainer;

                if (playerId) {
                    const nameplateData = activeNameplates.find(n => n.data.id === playerId);
                    if (nameplateData) {
                        const nameplate = nameplateData.nameplate;
                        const isSelf = playerId === selfPlayerId;

                        // Place in role slot
                        slotContainer.addContent(nameplate);
                        slotContainer.toggleContentVisibility('placeholderText', false);

                        const roleColor = slotView.roleColor;
                        nameplate.updateStyle(true, subColor, isSelf, roleColor);
                        nameplate.setVacateVisible(isSelf);

                        assignedIds.add(playerId);
                    }
                } else {
                    // No player assigned to this role
                    slotContainer.toggleContentVisibility('placeholderText', true);
                }
            });
        });

        // 5. **POSITION: Mount unassigned players to unassigned panel**
        const unassignedPanel = this.views.unassigned;
        
        activeNameplates
            .filter(n => !assignedIds.has(n.data.id))
            .sort((a, b) => (a.data.connectionOrder || 0) - (b.data.connectionOrder || 0))
            .forEach(({ nameplate }) => {
                unassignedPanel.addContent(nameplate);
                nameplate.updateStyle(false, Colors.border, false);
            });

        // 6. Update Editing Permissions
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
