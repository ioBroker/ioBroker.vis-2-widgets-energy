/**
 * The handshake between the `IntervalSelector` widget and the widgets that follow its period.
 *
 * There is no vis-2 API for widget-to-widget communication, so the selector publishes itself through the DOM:
 * it renders a `div.time-selector` and hangs `_addEventHandler` / `_removeEventHandler` on that node. A consumer
 * that was configured with the `timeWidget` attribute looks the node up by widget id and subscribes.
 *
 * The part that is easy to get wrong is the timing: widget mount order is not guaranteed, so the node may not
 * exist yet when a consumer mounts, and the selector may be unmounted and mounted again at any time (e.g. when
 * it is moved in the editor). `TimeSelectorSubscriber` encapsulates the retry-until-found and the
 * re-subscribe-after-unmount, so every consumer gets the same behaviour instead of copying the loop.
 */
import type { TimeIntervalType } from './Utils';

export interface TimeSelectorValue {
    /** Start of the shown period, 0/null means "the current one" */
    start: number;
    /** Length of the shown period */
    interval: TimeIntervalType;
}

export type TimeSelectorEventHandler = (event: 'unmount' | 'update', value?: TimeSelectorValue) => void;

export type TimeSelectorNode = HTMLDivElement & {
    _addEventHandler?: ((cb: TimeSelectorEventHandler) => void) | null;
    _removeEventHandler?: ((cb: TimeSelectorEventHandler) => void) | null;
};

/** Kept for backwards compatibility with the former export of `IntervalSelector` */
export type HTMLDiv = TimeSelectorNode;

/** How often a consumer looks for the DOM node of a selector that has not mounted yet */
const RETRY_INTERVAL_MS = 300;

/**
 * Find the DOM node of an interval selector widget
 *
 * @param widgetId - id of the `IntervalSelector` widget, e.g. `w000001`
 * @returns The node, or null while the selector is not mounted (yet)
 */
export function findTimeSelector(widgetId: string): TimeSelectorNode | null {
    if (!widgetId) {
        return null;
    }
    const el = window.document.getElementById(widgetId);
    const div: TimeSelectorNode | null | undefined = el?.querySelector('.time-selector');

    return div?._addEventHandler ? div : null;
}

/**
 * Follows the period of an `IntervalSelector` widget.
 *
 * Create one per consuming widget, call `connect()` from `componentDidMount` and `componentDidUpdate` with the
 * currently configured widget id, and `destroy()` from `componentWillUnmount`.
 */
export class TimeSelectorSubscriber {
    /** Widget id this subscriber is currently attached to, empty while it is not attached */
    private attachedTo = '';

    /** Widget id it wants to be attached to */
    private wantedId = '';

    private retryTimer: ReturnType<typeof setInterval> | null = null;

    private lastValue: TimeSelectorValue | null = null;

    private readonly onChange: (value: TimeSelectorValue) => void;

    constructor(onChange: (value: TimeSelectorValue) => void) {
        this.onChange = onChange;
    }

    /** Last period announced by the selector, or null while none was received */
    get value(): TimeSelectorValue | null {
        return this.lastValue;
    }

    /**
     * Attach to a selector, switch to a different one, or detach
     *
     * Safe to call on every render: it only does something when the wanted widget id changed or when the
     * selector has not been found yet.
     *
     * @param widgetId - id of the selector widget, empty to detach
     */
    connect(widgetId: string): void {
        const wanted = widgetId || '';

        if (wanted !== this.wantedId) {
            this.wantedId = wanted;
            this.detach();
            this.lastValue = null;
        }

        if (!this.wantedId || this.attachedTo) {
            return;
        }

        // Try right away - in the common case the selector is already mounted and no timer is needed at all
        if (this.attach()) {
            return;
        }

        this.retryTimer ||= setInterval(() => {
            if (!this.wantedId || this.attach()) {
                this.stopRetry();
            }
        }, RETRY_INTERVAL_MS);
    }

    /** Detach and stop every timer. Call from `componentWillUnmount`. */
    destroy(): void {
        this.wantedId = '';
        this.detach();
    }

    private attach(): boolean {
        const node = findTimeSelector(this.wantedId);
        if (!node?._addEventHandler) {
            return false;
        }
        node._addEventHandler(this.handleEvent);
        this.attachedTo = this.wantedId;
        return true;
    }

    private detach(): void {
        this.stopRetry();
        if (this.attachedTo) {
            findTimeSelector(this.attachedTo)?._removeEventHandler?.(this.handleEvent);
            this.attachedTo = '';
        }
    }

    private stopRetry(): void {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
        }
    }

    private readonly handleEvent: TimeSelectorEventHandler = (event, value): void => {
        if (event === 'unmount') {
            // The selector went away - forget the node and start looking for it again, it may come back
            this.attachedTo = '';
            this.connect(this.wantedId);
            return;
        }

        if (event === 'update' && value) {
            if (this.lastValue?.start !== value.start || this.lastValue?.interval !== value.interval) {
                this.lastValue = { start: value.start, interval: value.interval };
                this.onChange(this.lastValue);
            }
        }
    };
}
