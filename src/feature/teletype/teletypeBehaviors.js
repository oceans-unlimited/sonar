import { ROW_HEIGHT } from './terminalBox.js';

const SNAP_BACK_DELAY = 2000;  // ms of inactivity before snapping back
const SNAP_BACK_DURATION = 300; // ms for the snap-back tween

/**
 * Creates a scroll behavior for a TerminalBox.
 * Adds drag/touch scrolling of the rowWrapper with clamping and snap-back.
 * 
 * Follows the functional composition pattern (like createInteractable).
 * 
 * @param {import('./terminalBox').default} terminalBox - The TerminalBox instance.
 * @returns {{ destroy: Function, snapToLive: Function, getState: Function }}
 */
export function createScrollBehavior(terminalBox) {
    const target = terminalBox;
    const wrapper = terminalBox.rowWrapper;

    // --- Internal State ---
    let isDragging = false;
    let isUserScrolled = false;
    let dragStartY = 0;
    let wrapperStartY = 0;
    let snapTimer = null;

    // --- Helpers ---

    /** Total pixel height of all rows in the wrapper. */
    function getContentHeight() {
        return terminalBox.rows.length * ROW_HEIGHT;
    }

    /** Whether there's enough content to scroll. */
    function isScrollable() {
        return getContentHeight() > terminalBox.terminalHeight;
    }

    /** Clamp wrapper.y between scroll bounds. */
    function clampY(y) {
        const liveY = terminalBox.getLiveY();
        const PADDING = 15; // Should ideally import from terminalBox, but 15 is safe for now

        // Lower bound: "live" position (newest message at bottom)
        const minY = liveY;
        
        // Upper bound: oldest message at top of viewport
        const maxY = PADDING;

        return Math.max(minY, Math.min(maxY, y));
    }

    /** Schedule a snap-back to the live position after inactivity. */
    function scheduleSnapBack() {
        clearSnapTimer();
        snapTimer = setTimeout(() => {
            snapToLive();
        }, SNAP_BACK_DELAY);
    }

    function clearSnapTimer() {
        if (snapTimer) {
            clearTimeout(snapTimer);
            snapTimer = null;
        }
    }

    /** Tween back to the live scroll position. */
    async function snapToLive() {
        clearSnapTimer();
        const liveY = terminalBox.getLiveY();
        await terminalBox.tweenTo(wrapper, 'y', liveY, SNAP_BACK_DURATION);
        isUserScrolled = false;
    }

    // --- Pointer Handlers ---

    function onPointerDown(e) {
        if (!isScrollable()) return;

        isDragging = true;
        dragStartY = e.global.y;
        wrapperStartY = wrapper.y;
        clearSnapTimer();
    }

    function onPointerMove(e) {
        if (!isDragging) return;

        const delta = e.global.y - dragStartY;
        wrapper.y = clampY(wrapperStartY + delta);
        isUserScrolled = (wrapper.y !== terminalBox.getLiveY());
    }

    function onPointerUp() {
        if (!isDragging) return;

        isDragging = false;

        if (isUserScrolled) {
            scheduleSnapBack();
        }
    }

    // --- Attach Listeners ---
    target.eventMode = 'static';
    target.cursor = 'grab';

    target.on('pointerdown', onPointerDown);
    target.on('pointermove', onPointerMove);
    target.on('pointerup', onPointerUp);
    target.on('pointerupoutside', onPointerUp);

    // --- Public API ---
    return {
        destroy() {
            clearSnapTimer();
            target.off('pointerdown', onPointerDown);
            target.off('pointermove', onPointerMove);
            target.off('pointerup', onPointerUp);
            target.off('pointerupoutside', onPointerUp);
        },
        snapToLive,
        getState() {
            return { isDragging, isUserScrolled };
        }
    };
}
