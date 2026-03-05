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
     * Resolves an interrupt.
     */
    resolve(type) {
        interruptManager.resolveInterrupt(type);
    }
}

export const interruptController = new InterruptController();

