import { BaseController } from './baseController';
import { setColor, cascadeColor } from '../render/util/colorOps.js';
import { Colors } from '../core/uiStyle.js';

export class ColorTestController extends BaseController {
    constructor() {
        super();
        
        console.log('[ColorTestController] Initialized.');

        this.handlers = {
            ...this.handlers,
            
            // Triggered by the on-screen button
            'TOGGLE_HEADER': (data) => this.handleHeaderToggle(data),
            'CYCLE_BORDER': (data) => this.handleCycleBorder(data)
        };

        this.borderColorIndex = 0;
    }

    onSocketBound() {
        // Listen for commands from the Director scenario
        if (this.socket) {
            this.socket.on('DIRECTOR_CMD', (data) => this.handleDirectorCmd(data));
        }
    }
    
    onSocketUnbound() {
        if (this.socket) {
            this.socket.off('DIRECTOR_CMD');
        }
    }

    handleHeaderToggle(data) {
        console.log('[ColorTestController] Toggling header color...', data);
        const { isActive } = data;
        const block = this.visuals['test_block'];
        
        if (block) {
            const color = isActive ? Colors.warning : Colors.active;
            cascadeColor(block, color, 'blockLabel');
            cascadeColor(block, color, 'headerLine');
        }
    }

    handleCycleBorder(data) {
        console.log('[ColorTestController] Cycling border color...');
        const panel = this.visuals['test_panel_1'];
        if (panel) {
            const sequence = [Colors.text, Colors.warning, Colors.danger];
            this.borderColorIndex = (this.borderColorIndex + 1) % sequence.length;
            const nextColor = sequence[this.borderColorIndex];
            
            if (typeof panel.setBorderColor === 'function') {
                panel.setBorderColor(nextColor);
            }
        }
    }

    handleDirectorCmd(data) {
        console.log('[ColorTestController] Received Director CMD:', data);
        const { target, action, value } = data;
        const visual = this.visuals[target];
        
        if (!visual) {
            console.warn(`[ColorTestController] Target visual not found: ${target}`);
            return;
        }

        // Resolve Color
        let colorValue = value;
        if (typeof value === 'string' && value in Colors) {
            colorValue = Colors[value];
        }

        if (action === 'set_color') {
            setColor(visual, colorValue);
        } else if (action === 'set_border_color') {
            if (typeof visual.setBorderColor === 'function') {
                visual.setBorderColor(colorValue);
            } else {
                cascadeColor(visual, colorValue, 'panelFrame');
            }
        } else if (action === 'set_text_color') {
             cascadeColor(visual, colorValue, 'blockLabel');
        }
    }
}