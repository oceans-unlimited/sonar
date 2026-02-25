import { BaseController } from './baseController';

export class MapController extends BaseController {
    constructor() {
        super();
        this.rowLabelsRight = false;
        this._lastPos = null;

        this.handlers = {
            ...this.handlers,
            'TOGGLE_ROW_LABELS': () => this.handleToggleRowLabels()
        };
    }

    onGameStateUpdate(state) {
        if (!state || !state.submarines || !this.socket) return;

        const playerId = this.socket.playerId;
        const mySub = state.submarines.find(sub =>
            sub.co === playerId ||
            sub.xo === playerId ||
            sub.sonar === playerId ||
            sub.eng === playerId
        );

        if (!mySub) return;

        const { row, col } = mySub;

        if (row !== undefined && col !== undefined) {
            // Check for position change
            if (!this._lastPos || this._lastPos.row !== row || this._lastPos.col !== col) {
                const isInitial = !this._lastPos;
                this._lastPos = { row, col };

                const msg = `[MapController] Sub Position Updated to ${row}, ${col}`;
                console.log(msg);
                if (window.logEvent) window.logEvent(msg);

                if (this.view && this.view.mapView) {
                    this.view.mapView.setOwnShipPosition(row, col, !isInitial);
                }
            }
        }
    }

    onViewBound(view) {
        super.onViewBound(view);
        console.log('[MapController] View bound.');

        // If we already have state, sync the marker now that the view is ready
        if (this.lastState) {
            this.onGameStateUpdate(this.lastState);
        }
    }

    handleToggleRowLabels() {
        this.rowLabelsRight = !this.rowLabelsRight;
        console.log('[MapController] Toggling row labels to right:', this.rowLabelsRight);

        // Find the map renderer's view area and update it
        if (this.view && this.view.mapView) {
            this.view.mapView.setRowLabelsSide(this.rowLabelsRight);
        } else {
            console.warn('[MapController] Could not find mapView on bound view.');
        }
    }
}
