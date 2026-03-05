/**
 * Color Test Controller
 * Used for testing color and visual updates in the test scene.
 */

import { BaseController } from './baseController';
import { cascadeColor } from '../render/util/colorOps';

export class ColorTestController extends BaseController {
    constructor() {
        super();

        this.colorIndex = 0;
        this.testColors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22];

        // --- Handler Map ---
        this.handlers = {
            ...this.handlers,
            'TOGGLE_HEADER': (d) => this.handleToggleHeader(d),
            'CYCLE_BORDER': (d) => this.handleCycleBorder(d),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d),
            
            // Realtime Engine Logic Handlers (for logging/verification)
            'LOG_SUB_STATE': () => this.logSubmarineStatus(),
            'LOG_INTERRUPT': () => this.logInterruptStatus(),
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[ColorTestController] View bound.');
    }

    onFeaturesBound() {
        super.onFeaturesBound();
        console.log('[ColorTestController] Features bound:', Object.keys(this.features));
        
        // Setup listeners for feature-level events if they exist
        if (this.features.submarine) {
            // Future: subscribe to sub-state changes
        }
    }

    onGameStateUpdate(state) {
        super.onGameStateUpdate(state);
        // Log state changes to Director Panel
        if (typeof window !== 'undefined' && window.logEvent) {
            const phase = state.phase || 'UNKNOWN';
            const interrupt = state.activeInterrupt?.type || 'NONE';
            window.logEvent(`[Logic] Phase: ${phase} | Interrupt: ${interrupt}`);
        }
    }

    // ─────────── Handlers ───────────

    logSubmarineStatus() {
        const sub = this.features.submarine;
        if (sub) {
            const status = `Submarine: State=${sub.getState()} | Health=${sub.getHealth()}`;
            console.log(status);
            if (window.logEvent) window.logEvent(status);
        } else {
            console.warn('Submarine feature not bound.');
        }
    }

    logInterruptStatus() {
        const interrupt = this.features.interrupt;
        if (interrupt) {
            const active = interrupt.getActiveInterrupt();
            const status = `Interrupt: ${active ? active.type : 'NONE'}`;
            console.log(status);
            if (window.logEvent) window.logEvent(status);
        } else {
            console.warn('Interrupt feature not bound.');
        }
    }

    handleToggleHeader({ blockId, color }) {
        const visual = this.visuals.get(blockId);
        if (visual && typeof visual.setTint === 'function') {
            visual.setTint(color);
        }
        if (typeof window !== 'undefined' && window.logEvent) {
            window.logEvent(`Header color changed: ${blockId} → 0x${color.toString(16)}`);
        }
    }

    handleCycleBorder({ panelId }) {
        const panel = this.visuals.get(panelId);
        if (panel && typeof panel.setBorderColor === 'function') {
            this.colorIndex = (this.colorIndex + 1) % this.testColors.length;
            panel.setBorderColor(this.testColors[this.colorIndex]);
        }

        if (typeof window !== 'undefined' && window.logEvent) {
            window.logEvent(`Border cycled: ${panelId} → 0x${this.testColors[this.colorIndex].toString(16)}`);
        }
    }
}
