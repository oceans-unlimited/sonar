import { BaseController } from '../../control/baseController';

/**
 * InterruptController
 * Server-driven interrupt API.
 * 
 * This controller ONLY emits socket events to express client intent.
 * It does NOT call interruptManager directly.
 * 
 * Interrupt state changes flow exclusively through:
 *   Server → state.activeInterrupt → SceneManager._setupStateSync() → interruptManager
 */
export class InterruptController extends BaseController {
    constructor() {
        super();
        this.handlers = {
            ...this.handlers,
            'READY_INTERRUPT': () => this._emitReady()
        };
    }

    onSocketBound() {
        super.onSocketBound();
        console.log('[InterruptController] Socket bound.');
    }

    // ─────────── Client → Server Intent ───────────

    /**
     * Signals the server that the Captain wants to pause the game.
     * Server validates and broadcasts state with activeInterrupt if approved.
     */
    requestPause() {
        if (this.socket) {
            this.socket.emit('request_pause');
        }
    }

    /**
     * Signals the server that the local player is ready to resume.
     * Server collects ready signals and resolves the interrupt when all are in.
     */
    readyInterrupt() {
        this.handleEvent('READY_INTERRUPT');
    }

    /**
     * Submits the Captain's sonar response to the server.
     * @param {object} data - { sector, row } or similar response payload.
     */
    submitSonarResponse(data) {
        if (this.socket) {
            this.socket.emit('submit_sonar_response', data);
        }
    }

    // ─────────── Internal ───────────

    _emitReady() {
        if (this.socket) {
            this.socket.emit('ready_interrupt');
        }
    }
}

export const interruptController = new InterruptController();
