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
            'TOGGLE_HEADER': (d) => this.handleToggleHeader(d),
            'CYCLE_BORDER': (d) => this.handleCycleBorder(d),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d),
        };
    }

    // ─────────── Lifecycle ───────────

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[ColorTestController] View bound.');
    }

    // ─────────── Handlers ───────────

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
