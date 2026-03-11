import { BaseController } from './baseController';
import { Colors } from '../core/uiStyle';

/**
 * SubmarineTestController
 * Dedicated controller for the Submarine Logic Test scene.
 * Focuses on executing method tests and reporting results to a teletype terminal.
 */
export class SubmarineTestController extends BaseController {
    constructor() {
        super();
        
        this.handlers = {
            ...this.handlers,
            'RUN_METHOD_TEST': (d) => this.handleMethodTest(d),
            'LOG_TO_TERMINAL': (d) => this.pushToTerminal(d.text, d.color),
            'DIRECTOR_CMD': (d) => this.handleDirectorCmd(d)
        };
    }

    onViewBound(view) {
        super.onViewBound(view);
        this.pushToTerminal('>> System Initialized. Awaiting Submarine Data...', Colors.primary);
        
        // --- Sync Initial State (if already resolved) ---
        const subFeature = this.features.get('submarine');
        if (subFeature) {
            const sub = subFeature.getOwnship();
            if (sub) {
                const role = subFeature.getLocalRole();
                this.pushToTerminal(`>> IDENTITY RESOLVED: SUB ${sub._id} [${role.toUpperCase()}]`, Colors.success);
            }
        }
    }

    onFeaturesBound() {
        super.onFeaturesBound();
        
        // Listen for future identity resolution
        this.subscribeToFeature('submarine', 'identity:resolved', ({ sub, role }) => {
            this.pushToTerminal(`>> IDENTITY RESOLVED: SUB ${sub._id} [${role.toUpperCase()}]`, Colors.success);
        });
    }

    onSocketBound() {
        super.onSocketBound();
        // Manual binding removed - handled by agnostic DIRECTOR_CMD in BaseController
    }

    /**
     * Specialized handler for Director commands.
     * Routes 'type' fields to local handlers.
     */
    handleDirectorCmd(data) {
        const type = data.type || data.action;
        if (type && this.handlers[type]) {
            this.handleEvent(type, data);
        }
    }

    /**
     * Executes a logic test based on scenario instructions.
     * @param {object} data - { method, args, expected }
     */
    handleMethodTest(data) {
        const { method, args = [], label } = data;
        const subFeature = this.features.get('submarine');
        const ownship = subFeature?.getOwnship();

        if (!ownship) {
            this.pushToTerminal(`!! ERROR: No ownship found for test: ${label}`, Colors.danger);
            return;
        }

        this.pushToTerminal(`>> RUNNING TEST: ${label}...`, Colors.primary);

        try {
            // Execute the method on the View Model (SubmarineState)
            let result;
            if (typeof ownship[method] === 'function') {
                result = ownship[method](...args);
            } else {
                result = ownship[method]; // Try property if not a method
            }

            // Format result for display
            const output = typeof result === 'object' ? JSON.stringify(result) : String(result);
            this.pushToTerminal(`   RESULT: ${output}`, Colors.active);
            
            if (typeof window !== 'undefined' && window.logEvent) {
                window.logEvent(`Test ${label}: ${output}`);
            }
        } catch (e) {
            this.pushToTerminal(`!! TEST FAILED: ${e.message}`, Colors.danger);
        }
    }

    pushToTerminal(text, color = Colors.text) {
        const terminal = this.visuals.get('terminal');
        if (terminal && typeof terminal.appendLine === 'function') {
            terminal.appendLine(text, { fill: color });
        } else {
            console.log(`[SubmarineTest] ${text}`);
        }
    }
}
