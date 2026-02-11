/**
 * XO Controller
 * Handles logic for the XO (First Officer) scene.
 * Manages subsystem charging levels, interaction locks, and server sync.
 */

import { BaseController } from './baseController';
import { SystemColors } from '../core/uiStyle';
import { simulationClock } from '../core/clock/simulationClock';

export class XOController extends BaseController {
    constructor(socketManager, sceneManager) {
        super(socketManager, sceneManager);

        this.subsystemLevels = {
            sonar: 0,
            drone: 0,
            mine: 0,
            torpedo: 0,
            silence: 0,
            scenario: 0
        };

        this.maxLevels = {
            sonar: 4,
            drone: 3,
            mine: 3,
            torpedo: 3,
            silence: 6,
            scenario: 4
        };

        this.isInteractionLocked = true;

        // --- Handler Map ---
        this.handlers = {
            'CHARGE_SUBSYSTEM': this.handleCharge,
            'DISCHARGE_SUBSYSTEM': this.handleDischarge,
            'DIRECTOR_CMD': this.handleDirectorCmd,
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        console.log('[XOController] View bound.');

        // Register rows from the view if they exist
        if (view._rows) {
            view._rows.forEach((row, key) => {
                this.registerVisual(`row_${key}`, row);
            });
        }

        // Listen for game state updates
        this.onSocket('stateUpdate', (state) => this.onGameStateUpdate(state));
    }

    onGameStateUpdate(state) {
        const playerId = this.socketManager.playerId;
        if (!playerId || !state?.submarines) return;

        const sub = state.submarines.find(s =>
            s.crew && Object.values(s.crew).includes(playerId)
        );
        if (!sub) return;

        // 1. Sync Levels
        Object.keys(this.subsystemLevels).forEach(key => {
            if (sub.actionGauges && sub.actionGauges[key] !== undefined) {
                this.subsystemLevels[key] = sub.actionGauges[key];
                const row = this.visuals.get(`row_${key}`);
                if (row) row.setLevel(this.subsystemLevels[key]);
            }
        });

        // 2. Interaction State
        const isLive = state.phase === 'LIVE';
        const isPostMove = sub.submarineState === 'POST_MOVEMENT';
        const hasCharged = isPostMove && sub.submarineStateData?.POST_MOVEMENT?.xoChargedGauge;
        const isClockRunning = simulationClock.isRunning();

        this.isInteractionLocked = !isLive || !isClockRunning || (isPostMove && hasCharged) || (!isPostMove);

        // Update all rows (interactive state)
        this.visuals.forEach((row, id) => {
            if (!id.startsWith('row_')) return;
            const key = id.replace('row_', '');

            const isFull = this.subsystemLevels[key] >= this.maxLevels[key];
            const canCharge = !this.isInteractionLocked && !isFull;
            const canDischarge = isLive && isFull;

            row.eventMode = (canCharge || canDischarge) ? 'static' : 'none';
            row.cursor = (canCharge || canDischarge) ? 'pointer' : 'default';
            row.alpha = (canCharge || canDischarge) ? 1.0 : 0.6;
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
        this.socketManager.chargeGauge(key);
    }

    handleDischarge({ key }) {
        if (this.subsystemLevels[key] < this.maxLevels[key]) return;

        console.log(`[XOController] Discharging: ${key}`);
        // TODO: Emit discharge to server
        this.socketManager.socket?.emit('discharge_gauge', key);
    }

    handleDirectorCmd(cmd) {
        console.log(`[XOController] Director command:`, cmd);
        if (cmd.type === 'stateUpdate') {
            this.onGameStateUpdate(cmd.payload);
        }
    }
}
