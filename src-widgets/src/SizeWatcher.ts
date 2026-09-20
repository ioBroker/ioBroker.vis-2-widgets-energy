/**
 * Keeps the chart widgets in sync with the size of their container.
 *
 * The echarts wrapper needs an explicit pixel height, so every chart widget read `offsetHeight` while it
 * rendered and asked for one more render when the ref was not filled yet. That works exactly once: resizing the
 * widget in the editor, a responsive view or a collapsing card left the chart at its old height until something
 * else re-rendered the widget. A `ResizeObserver` reports every change instead.
 */
export type SizeHandler = (width: number, height: number) => void;

export class SizeWatcher {
    private observer: ResizeObserver | null = null;

    private element: HTMLElement | null = null;

    private readonly onChange: SizeHandler;

    constructor(onChange: SizeHandler) {
        this.onChange = onChange;
    }

    /**
     * Watch an element. Safe to call on every render - re-observing the same element does nothing.
     *
     * @param element - the container of the chart, null while the ref is not filled yet
     */
    observe(element: HTMLElement | null): void {
        if (element === this.element) {
            return;
        }
        this.disconnect();
        this.element = element;
        if (!element) {
            return;
        }

        // ResizeObserver exists in every browser vis-2 supports; the guard is only for the test runner
        if (typeof ResizeObserver === 'undefined') {
            this.onChange(element.offsetWidth, element.offsetHeight);
            return;
        }

        this.observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                this.onChange(Math.round(width), Math.round(height));
            }
        });
        this.observer.observe(element);
        this.onChange(element.offsetWidth, element.offsetHeight);
    }

    /** Stop watching. Call from `componentWillUnmount`. */
    disconnect(): void {
        this.observer?.disconnect();
        this.observer = null;
        this.element = null;
    }
}
