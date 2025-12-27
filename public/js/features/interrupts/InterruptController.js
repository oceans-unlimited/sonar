import { interruptManager } from './InterruptManager.js';

/**
 * Controller-facing API for requesting interrupts.
 * Translates UI/Server intent into InterruptManager requests.
 */
export class InterruptController {
    /**
     * Requests a pause interrupt.
     */
    requestPause() {
        interruptManager.requestInterrupt('PAUSE');
    }

    /**
     * Resolves a pause interrupt.
     */
    resolvePause() {
        interruptManager.resolveInterrupt('PAUSE');
    }

    /**
     * Requests torpedo resolution interrupt.
     * @param {object} payload - torpedo data, target, etc.
     */
    requestTorpedoResolution(payload) {
        interruptManager.requestInterrupt('TORPEDO_RESOLUTION', payload);
    }

    /**
     * Resolves torpedo resolution.
     */
    resolveTorpedo() {
        interruptManager.resolveInterrupt('TORPEDO_RESOLUTION');
    }

    // Add other shorthand methods as needed (SONAR_PING, etc.)
}

export const interruptController = new InterruptController();
