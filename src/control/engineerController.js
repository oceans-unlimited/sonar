/**
 * Engineer Controller
 * Handles the logic for the Engineer station scene.
 * Manages cross-off actions, system state updates, and interaction locks.
 */

import { BaseController } from './baseController';
import { Colors } from '../core/uiStyle';

export class EngineerController extends BaseController {
    constructor() {
        super();

        // Engineer-specific state
        this.engineState = null;
        this.isInteractionLocked = true; // Locked until server says otherwise

        // --- Handler Map ---
        this.handlers = {
            'CROSS_OFF': (d) => this.handleCrossOff(d),
            'TOGGLE_REACTOR': (d) => this.handleReactor(d),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d),
        };
    }

    // ─────────── Lifecycle ───────────

    onFeaturesBound() {
        super.onFeaturesBound();
        console.log('[EngineerController] Features bound.');

        // Initial Sync
        const subController = this.features.get('submarine');
        const sub = subController?.getOwnship();
        if (sub) {
            this._syncWithSubmarine(sub);
        }

        // Handle delayed identity resolution (common in Director mode scenarios)
        this.subscribeToFeature('submarine', 'identity:resolved', ({ sub }) => {
            console.log('[EngineerController] Identity resolved. Performing sync.');
            this._syncWithSubmarine(sub);
        });

        // Subscribe to high-signal feature events
        this.subscribeToFeature('submarine', 'sub:stateChanged', ({ state }) => {
            console.log(`[EngineerController] State changed: ${state}`);
            const sub = this.features.get('submarine')?.getOwnship();
            if (sub) this.updateEngineView(this.lastState, sub);
        });

        this.subscribeToFeature('submarine', 'sub:engineUpdated', (data) => {
            console.log('[EngineerController] Engine updated');
            const sub = this.features.get('submarine')?.getOwnship();
            if (sub) {
                this.engineState = sub.getEngineLayout();
                this.updateEngineView(this.lastState, sub);

                // Breakdown Feedback (triggered when newCount is 0 after a reset)
                if (data.wasReset) {
                    // Note: Thresholds are set to account for server-side processing where the final slot 
                    // causes an immediate reset, so the client only sees the jump from the previous state.
                    if (data.previousCount >= 5) {
                        // 5 -> 0 transition: Cardinal or Reactor breakdown
                        this.pushAtmosphereMessage('>>> CRITICAL FAILURE: SYSTEMS OVERLOAD <<<');
                        this.pushAtmosphereMessage('>>> EMERGENCY BOARD RESET COMPLETE <<<');
                    } else if (data.previousCount >= 3) {
                        // 3 -> 0 transition: Likely a circuit completion (4 slots)
                        this.pushAtmosphereMessage('>>> CIRCUIT REPAIRED: SYSTEMS RESET <<<');
                    }
                }
            }
        });
    }

    _syncWithSubmarine(sub) {
        const engineLayout = sub.getEngineLayout();
        if (!engineLayout) return;

        // If view hasn't been populated yet, do it now
        if (this.view && !this.view._populated && engineLayout.directions) {
            console.log('[EngineerController] Populating view with layout');
            this.view.populate(engineLayout);
            this.view._populated = true;
        }

        this.engineState = engineLayout;
        this.updateEngineView(this.lastState, sub);
    }

    onGameStateUpdate(state) {
        // We no longer trigger view updates from the raw state here.
        // We only cache the state for reference in updateEngineView.
        super.onGameStateUpdate(state);
    }

    // ─────────── View Updates ───────────

    /**
     * Pushes a localized atmosphere message to the teletype.
     * @param {string} text - The message text.
     */
    pushAtmosphereMessage(text) {
        this.pushTeletype(text, { color: Colors.text });
    }

    /**
     * Syncs the visual state of all buttons with the game state.
     * @param {object} state - The full game state
     * @param {object} sub - The player's submarine (SubmarineState instance)
     */
    updateEngineView(state, sub) {
        if (!this.engineState) return;

        // Canonical submarine state checks (referencing SubmarineStates in constants.js)
        // Must be in MOVED state AND engineer must not have already crossed off a system.
        // Without the engineerCrossedOutSystem check, the engineer can click multiple slots
        // before the server responds, since MOVED persists until the XO also finishes.
        const movedData = sub.getStateData('MOVED');
        const activeDirection = movedData?.directionMoved; // 'N', 'E', 'S', 'W'
        const canInteract = sub.getState() === 'MOVED' && !movedData?.engineerCrossedOutSystem;
        
        this.isInteractionLocked = !canInteract;

        const crossedOutSlots = this.engineState.crossedOutSlots || [];

        // 1. Process Frame Slots (Circuits)
        for (const [direction, dirData] of Object.entries(this.engineState.directions || {})) {
            const isDirectionActive = canInteract && direction === activeDirection;

            for (const [slotId, _] of Object.entries(dirData.frameSlots || {})) {
                const buttonId = `${direction}:${slotId}`;
                const ctrl = this.buttons.get(buttonId);
                if (!ctrl) continue;

                // Check if this specific slot is in the crossed out list
                const isCrossed = crossedOutSlots.some(
                    xo => xo.direction === direction && xo.slotId === slotId
                );

                if (isCrossed) {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                } else if (isDirectionActive) {
                    ctrl.setEnabled(true);
                    ctrl.setActive(true);
                } else {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                }
            }

            // 2. Process Reactor Slots
            for (const [slotId, _] of Object.entries(dirData.reactorSlots || {})) {
                const buttonId = `${direction}:${slotId}`;
                const ctrl = this.buttons.get(buttonId);
                if (!ctrl) continue;

                const isCrossed = crossedOutSlots.some(
                    xo => xo.direction === direction && xo.slotId === slotId
                );

                if (isCrossed) {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                } else if (isDirectionActive) {
                    ctrl.setEnabled(true);
                    ctrl.setActive(true);
                } else {
                    ctrl.setEnabled(false);
                    ctrl.setActive(false);
                }
            }
        }

        // 3. Update System Status Cards
        const systemsStatus = {
            vessel: true,
            weapons: true,
            detection: true
        };

        crossedOutSlots.forEach(slot => {
            const dirData = this.engineState.directions[slot.direction];
            if (!dirData) return;
            const systemName = dirData.frameSlots[slot.slotId] || dirData.reactorSlots[slot.slotId];
            if (systemName) {
                const key = systemName.toLowerCase();
                if (systemsStatus[key] !== undefined) {
                    systemsStatus[key] = false;
                }
            }
        });

        for (const [sys, isOnline] of Object.entries(systemsStatus)) {
            const visual = this.visuals.get(`status_${sys}`);
            if (visual && visual.updateStatus) {
                visual.updateStatus(isOnline);
            }
        }

        // 4. Update Cardinal Direction Frames
        const directions = ['N', 'E', 'S', 'W'];
        directions.forEach(dir => {
            const visual = this.visuals.get(dir);
            if (visual && visual.setTint) {
                // Highlight the active direction if in MOVED state, otherwise dim
                if (canInteract && dir === activeDirection) {
                    visual.setTint(Colors.roleCaptain); // Yellow highlight for the move direction
                } else {
                    // Normal state: active (has slots) or disabled (empty)
                    const dirData = this.engineState.directions[dir];
                    const allSlots = { ...dirData.reactorSlots, ...dirData.frameSlots };
                    const hasSlotsLeft = Object.keys(allSlots).some(slotId => {
                        return !(this.engineState.crossedOutSlots || []).some(
                            xo => xo.direction === dir && xo.slotId === slotId
                        );
                    });

                    visual.setTint(hasSlotsLeft ? Colors.active : 0x555555);
                }
            }
        });
    }

    // ─────────── Handlers ───────────

    handleCrossOff({ direction, slotId }) {
        if (this.isInteractionLocked) {
            console.warn('[EngineerController] Interaction locked.');
            return;
        }

        const dirData = this.engineState?.directions[direction];
        const systemName = dirData?.frameSlots[slotId] || dirData?.reactorSlots[slotId] || 'UNKNOWN';

        this.pushAtmosphereMessage(`> ${direction} ${systemName} OFFLINE`);
        console.log(`[EngineerController] Cross off: ${direction}/${slotId}`);
        this.socket.crossOffSystem(direction, slotId);
    }

    handleReactor({ reactorId }) {
        console.log(`[EngineerController] Toggle reactor: ${reactorId}`);
    }
}
