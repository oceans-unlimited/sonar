import { socketManager } from "../core/socketManager.js";

/**
 * Lobby Controller
 * Handles logic for the Lobby scene.
 * Coordinates between socketManager and LobbyRenderer.
 */
export class LobbyController {
    constructor(app, renderer) {
        this.app = app;
        this.renderer = renderer;
        this.state = null;

        // Bind update to this for event listener
        this.handleStateUpdate = (state) => this.update(state);
    }

    init() {
        console.log("[LobbyController] Initializing...");

        // Listen for state updates from the server
        socketManager.on('stateUpdate', this.handleStateUpdate);

        // Apply initial state if available
        if (socketManager.lastState) {
            this.update(socketManager.lastState);
        }
    }

    destroy() {
        console.log("[LobbyController] Destroying...");
        socketManager.off('stateUpdate', this.handleStateUpdate);
    }

    /**
     * Updates the UI based on state.
     * Translates server domain state into renderer calls.
     */
    update(state) {
        if (!state) return;
        this.state = state;

        const { playerName, subA, subB, unassigned } = this.renderer.views;
        const selfPlayerId = socketManager.playerId;

        // 1. Update player name (top left)
        const clientPlayer = state.players.find(p => p.id === selfPlayerId);
        if (clientPlayer && playerName) {
            playerName.text = clientPlayer.name;
        }

        // 2. Map internal server role keys to UI display role names
        const internalToDisplay = {
            co: 'Captain',
            xo: '1st Officer',
            sonar: 'Sonar',
            eng: 'Engineer'
        };

        const assignedPlayerIds = new Set();

        // 3. Update Sub Panels
        [subA, subB].forEach((subPanel, i) => {
            const subState = state.submarines[i];
            if (!subState || !subPanel) return;

            // Update sub name
            if (subPanel.nameField) {
                subPanel.nameField.text = subState.name || `Sub ${String.fromCharCode(65 + i)}`;
            }

            // Traditional roles
            const roles = ['co', 'xo', 'sonar', 'eng'];
            roles.forEach(internalRole => {
                const playerId = subState[internalRole];
                const displayRole = internalToDisplay[internalRole] || internalRole;

                if (playerId) {
                    const player = state.players.find(p => p.id === playerId);
                    if (player) {
                        player.ready = state.ready.includes(playerId);
                        subPanel.assignPlayerToRole(displayRole, player, selfPlayerId);
                        assignedPlayerIds.add(playerId);
                    }
                } else {
                    subPanel.vacatePlayer(displayRole);
                }
            });
        });

        // 4. Update Unassigned Panel
        const unassignedPlayers = state.players
            .filter(p => !assignedPlayerIds.has(p.id))
            .sort((a, b) => (a.connectionOrder || 0) - (b.connectionOrder || 0));

        unassignedPlayers.forEach(p => p.ready = state.ready.includes(p.id));

        if (unassigned && typeof unassigned.setPlayers === 'function') {
            unassigned.setPlayers(unassignedPlayers, selfPlayerId);
        }

        console.log("[LobbyController] UI Updated (version:", state.version, ")");
    }

    // --- Intent Methods (forwarded from Scene) ---

    requestRoleSelection(subId, roleName) {
        // Validation: Is this role available? 
        // We can check local state for extra safety/snappiness
        if (this.state) {
            const subIndex = subId === 'A' ? 0 : 1;
            const sub = this.state.submarines[subIndex];
            const internalRole = this._displayToInternal(roleName);

            if (sub && sub[internalRole]) {
                console.warn(`[LobbyController] Role ${roleName} already occupied.`);
                // We could trigger a "shake" effect on the button here if we had a reference
                return;
            }
        }

        console.log(`[LobbyController] Requesting Role: ${roleName} on Sub ${subId}`);
        socketManager.selectRole(subId, this._displayToInternal(roleName));
    }

    requestVacate() {
        console.log("[LobbyController] Requesting Vacate");
        socketManager.leaveRole();
    }

    requestNameChange(newName) {
        if (!newName || newName.trim() === "") return;
        console.log(`[LobbyController] Requesting Name Change: ${newName}`);
        socketManager.changeName(newName.trim());
    }

    requestSubRename(subId, newName) {
        console.log(`[LobbyController] Requesting Sub ${subId} Rename: ${newName}`);
        // socketManager.renameSub(subId, newName); // If supported
    }

    requestToggleReady() {
        if (!this.state) return;
        const selfId = socketManager.playerId;
        const isReady = this.state.ready.includes(selfId);

        if (isReady) {
            socketManager.notReady();
        } else {
            socketManager.ready();
        }
    }

    // --- Private Helpers ---

    _displayToInternal(roleName) {
        const map = {
            'Captain': 'co',
            '1st Officer': 'xo',
            'Sonar': 'sonar',
            'Engineer': 'eng'
        };
        return map[roleName] || roleName.toLowerCase();
    }
}
