/**
 * XO Controller
 * Handles logic for the XO (First Officer) scene.
 * Manages subsystem charging levels, interaction locks, and server sync.
 */

import { BaseController } from './baseController';
import { SystemColors } from '../core/uiStyle';
import { simulationClock } from '../core/clock/simulationClock';

export class XOController extends BaseController {
    constructor() {
        super();

        this.subsystemLevels = {
            sonar: 0,
            drone: 0,
            mine: 0,
            torpedo: 0,
            silence: 0,
            scenario: 0
        };

        this.maxLevels = {
            sonar: 3,
            drone: 3,
            mine: 3,
            torpedo: 3,
            silence: 5,
            scenario: 5
        };

        this.isInteractionLocked = false;

        // --- Handler Map ---
        this.handlers = {
            'CHARGE_SUBSYSTEM': (d) => this.handleCharge(d),
            'DISCHARGE_SUBSYSTEM': (d) => this.handleDischarge(d),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d),
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[XOController] View bound.');

        // Register rows from the view if they exist
        if (view._rows) {
            view._rows.forEach((row, key) => {
                this.registerVisual(`row_${key}`, row);
            });
        }
    }

    onGameStateUpdate(state) {
        if (!this.socket) return;
        const playerId = this.socket.playerId;
        if (!playerId || !state?.submarines) return;

        // Canonical server-side logic for finding the player's submarine
        const sub = state.submarines.find(s =>
            s.co === playerId || s.xo === playerId || s.sonar === playerId || s.eng === playerId
        );
        if (!sub) return;

        // 1. Sync Levels
        Object.keys(this.subsystemLevels).forEach(key => {
            if (sub.actionGauges && sub.actionGauges[key] !== undefined) {
                this.subsystemLevels[key] = sub.actionGauges[key];
                const row = this.visuals[`row_${key}`];
                if (row && row.setGaugeLevel) row.setGaugeLevel(this.subsystemLevels[key]);
            }
        });

        // 2. Interaction State
        const isLive = state.phase === 'LIVE';
        const isMoved = sub.submarineState === 'MOVED';
        const hasCharged = isMoved && sub.submarineStateData?.MOVED?.xoChargedGauge;
        const isClockRunning = simulationClock.isRunning();

        // Lock interaction if not in live phase, clock not running, already charged after move, or not in MOVED state during turn
        this.isInteractionLocked = !isLive || !isClockRunning || (isMoved && hasCharged) || (!isMoved);

        // Update all rows (interactive state)
        Object.entries(this.visuals).forEach(([id, row]) => {
            if (!id.startsWith('row_')) return;
            const key = id.replace('row_', '');

            const isFull = this.subsystemLevels[key] >= this.maxLevels[key];
            const canCharge = !this.isInteractionLocked && !isFull;
            const canDischarge = isLive && isFull;

            if (row.setInteractiveState) {
                row.setInteractiveState(canCharge || canDischarge);
            }
        });
    }

    // ─────────── Handlers ───────────

    handleCharge({ key }) {
        if (this.isInteractionLocked) {
            console.warn('[XOController] Interaction locked.');
            return;
        }

        if (this.subsystemLevels[key] >= this.maxLevels[key]) {
            console.warn(`[XOController] Subsystem ${key} already full.`);
            return;
        }

        console.log(`[XOController] Charging: ${key}`);
        this.socket.chargeGauge(key);
    }

    handleDischarge({ key }) {
        if (this.subsystemLevels[key] < this.maxLevels[key]) return;

        console.log(`[XOController] Discharging: ${key}`);
        // TODO: Emit discharge to server
        this.socket.emit('discharge_gauge', key);
    }
}
