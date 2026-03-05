import { BaseController } from '../../control/baseController';
import { interruptManager } from './InterruptManager.js';

/**
 * Controller-facing API for requesting interrupts.
 * Translates UI/Server intent into InterruptManager requests.
 */
export class InterruptController extends BaseController {
    constructor() {
        super();
        this.handlers = {
            ...this.handlers,
            'READY_INTERRUPT': () => this.handleReady()
        };
    }

    onSocketBound() {
        super.onSocketBound();
        console.log('[InterruptController] Socket bound.');
    }

    handleReady() {
        if (this.socket) {
            this.socket.readyInterrupt();
        }
    }

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
     * Requests weapon resolution interrupt.
     * @param {object} payload - weapon data, target, etc.
     */
    requestWeaponResolution(payload) {
        interruptManager.requestInterrupt('WEAPON_RESOLUTION', payload);
    }

    /**
     * Resolves weapon resolution.
     */
    resolveWeapon() {
        interruptManager.resolveInterrupt('WEAPON_RESOLUTION');
    }

    /**
     * Requests sonar ping interrupt.
     */
    requestSonarPing(payload) {
        interruptManager.requestInterrupt('SONAR_PING', payload);
    }

    /**
     * Requests scenario action interrupt.
     */
    requestScenarioAction(payload) {
        interruptManager.requestInterrupt('SCENARIO_ACTION', payload);
    }

    /**
     * Requests start positions interrupt.
     */
    requestStartPositions(payload) {
        interruptManager.requestInterrupt('START_POSITIONS', payload);
    }

    /**
     * Requests player disconnect interrupt.
     */
    requestPlayerDisconnect(payload) {
        interruptManager.requestInterrupt('PLAYER_DISCONNECT', payload);
    }

    /**
     * Signals that the local player is ready to resume from the interrupt.
     */
    readyInterrupt() {
        this.handleEvent('READY_INTERRUPT');
    }

    /**
     * Resolves an interrupt.
     */
    resolve(type) {
        interruptManager.resolveInterrupt(type);
    }
}

export const interruptController = new InterruptController();

