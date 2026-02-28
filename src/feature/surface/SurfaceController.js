import { BaseController } from '../../control/baseController';

/**
 * SurfaceController
 * Feature controller for managing the surfacing lifecycle and crew tasks.
 */
export class SurfaceController extends BaseController {
    constructor() {
        super();
        this.handlers = {
            ...this.handlers,
            /**
             * TRIGGER: Captain initiates surfacing.
             */
            'REQUEST_SURFACE': () => this.requestSurface(),
            /**
             * TRIGGER: Crew member completes a surfacing task.
             */
            'COMPLETE_TASK': () => this.completeTask(),
            /**
             * TRIGGER: Final submerge command once surfaced.
             */
            'REQUEST_SUBMERGE': () => this.requestSubmerge()
        };
    }

    /**
     * Emits the surface command to the server.
     */
    requestSurface() {
        if (this.socket) {
            console.log('[SurfaceController] Requesting surface...');
            this.socket.emit('surface');
        }
    }

    /**
     * Emits task completion for the current role.
     */
    completeTask() {
        if (this.socket) {
            console.log('[SurfaceController] Completing role task...');
            this.socket.emit('complete_surfacing_task');
        }
    }

    /**
     * Emits the submerge command once the sub is fully repaired.
     */
    requestSubmerge() {
        if (this.socket && this.lastState) {
            const sub = this.lastState.submarines?.find(s => 
                [s.co, s.xo, s.eng, s.sonar].includes(this.socket.playerId)
            );
            if (sub) {
                console.log(`[SurfaceController] Requesting submerge for sub ${sub.id}`);
                this.socket.emit('submerge', sub.id);
            }
        }
    }
}
