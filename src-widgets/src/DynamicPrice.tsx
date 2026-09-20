import React from 'react';

import ReactEchartsCore from 'echarts-for-react';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxData, VisRxWidgetState, WidgetData } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { cleanOid, formatNumber, toNumber } from './Utils';
import { SizeWatcher } from './SizeWatcher';

interface DynamicPriceState extends VisRxWidgetState {
    chartHeight?: number;
    /** Redrawn once an hour so that "the current hour" stays correct without a state change */
    nowHour?: number;
}

interface DynamicPriceRxData extends VisRxData {
    noCard: boolean;
    widgetTitle: string;
    'prices-oid': string;
    timeField: string;
    priceField: string;
    factor: number | string;
    unit: string;
    decimals: number;
    hoursCount: number;
    onlyFuture: boolean;
    highlight: 'rank' | 'average' | 'none';
    cheapCount: number;
    expensiveCount: number;
    averageTolerance: number;
    cheapColor: string;
    normalColor: string;
    expensiveColor: string;
    currentColor: string;
    showAverage: boolean;
    showCurrent: boolean;
}

/** One hour of the price curve */
interface PricePoint {
    start: number;
    price: number;
}

const styles: Record<string, React.CSSProperties> = {
    content: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    current: {
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontWeight: 'bold',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
    },
    chart: {
        flex: 1,
        minHeight: 0,
        width: '100%',
    },
    hint: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        opacity: 0.7,
        padding: 8,
        textAlign: 'center',
    },
};

/** Field names the known adapters use for the beginning of an hour */
const TIME_FIELDS = ['startsAt', 'start', 'start_timestamp', 'startTime', 'time', 'ts', 'date', 'timestamp'];

/** Field names the known adapters use for the price of an hour */
const PRICE_FIELDS = ['total', 'price', 'marketprice', 'amount', 'value', 'energy', 'cost'];

class DynamicPrice extends Generic<DynamicPriceRxData, DynamicPriceState> {
    private readonly refContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    private readonly sizeWatcher = new SizeWatcher((_width, height) => {
        if (height && height !== this.state.chartHeight) {
            this.setState({ chartHeight: height });
        }
    });

    private hourTimer?: ReturnType<typeof setTimeout> | null = null;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2DynamicPrice',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'dynamic_price', // Label of widget
            visHelp: 'help_dynamic_price', // Description in the palette
            visName: 'Dynamic price',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            tooltip: 'without_card_tooltip',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            tooltip: 'widget_title_tooltip',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'prices-oid',
                            label: 'prices_oid',
                            type: 'id',
                            tooltip: 'prices_oid_tooltip',
                        },
                        {
                            name: 'timeField',
                            label: 'time_field',
                            tooltip: 'time_field_tooltip',
                        },
                        {
                            name: 'priceField',
                            label: 'price_field',
                            tooltip: 'price_field_tooltip',
                        },
                        {
                            name: 'factor',
                            label: 'factor',
                            type: 'number',
                            default: 100,
                            tooltip: 'price_factor_tooltip',
                        },
                        {
                            name: 'unit',
                            label: 'unit',
                            default: 'ct/kWh',
                            tooltip: 'price_unit_tooltip',
                        },
                        {
                            name: 'decimals',
                            label: 'decimals',
                            type: 'slider',
                            min: 0,
                            max: 4,
                            default: 1,
                            tooltip: 'decimals_tooltip',
                        },
                        {
                            name: 'hoursCount',
                            label: 'hours_count',
                            type: 'number',
                            default: 24,
                            tooltip: 'hours_count_tooltip',
                        },
                        {
                            name: 'onlyFuture',
                            label: 'only_future',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'only_future_tooltip',
                        },
                        {
                            name: 'showCurrent',
                            label: 'show_current_price',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'show_current_price_tooltip',
                        },
                        {
                            name: 'showAverage',
                            label: 'show_average',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'show_average_tooltip',
                        },
                    ],
                },
                {
                    name: 'colors',
                    label: 'group_colors',
                    fields: [
                        {
                            name: 'highlight',
                            label: 'highlight_mode',
                            type: 'select',
                            tooltip: 'highlight_mode_tooltip',
                            default: 'rank',
                            options: [
                                { value: 'rank', label: 'highlight_rank' },
                                { value: 'average', label: 'highlight_average' },
                                { value: 'none', label: 'highlight_none' },
                            ],
                        },
                        {
                            name: 'cheapCount',
                            label: 'cheap_count',
                            type: 'slider',
                            min: 0,
                            max: 12,
                            default: 3,
                            tooltip: 'cheap_count_tooltip',
                            hidden: (data: WidgetData) => data.highlight !== 'rank',
                        },
                        {
                            name: 'expensiveCount',
                            label: 'expensive_count',
                            type: 'slider',
                            min: 0,
                            max: 12,
                            default: 3,
                            tooltip: 'expensive_count_tooltip',
                            hidden: (data: WidgetData) => data.highlight !== 'rank',
                        },
                        {
                            name: 'averageTolerance',
                            label: 'average_tolerance',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            default: 10,
                            tooltip: 'average_tolerance_tooltip',
                            hidden: (data: WidgetData) => data.highlight !== 'average',
                        },
                        {
                            name: 'cheapColor',
                            label: 'cheap_color',
                            type: 'color',
                            default: '#43a047',
                            tooltip: 'cheap_color_tooltip',
                        },
                        {
                            name: 'normalColor',
                            label: 'normal_color',
                            type: 'color',
                            default: '#90a4ae',
                            tooltip: 'normal_color_tooltip',
                        },
                        {
                            name: 'expensiveColor',
                            label: 'expensive_color',
                            type: 'color',
                            default: '#e53935',
                            tooltip: 'expensive_color_tooltip',
                        },
                        {
                            name: 'currentColor',
                            label: 'current_color',
                            type: 'color',
                            default: '#1e88e5',
                            tooltip: 'current_color_tooltip',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 400,
                height: 200,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_dynamic_price.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return DynamicPrice.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sizeWatcher.observe(this.refContent.current);
        this.scheduleHourChange();
    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);
        this.sizeWatcher.observe(this.refContent.current);
    }

    componentWillUnmount(): void {
        this.sizeWatcher.disconnect();
        this.hourTimer && clearTimeout(this.hourTimer);
        this.hourTimer = null;
        super.componentWillUnmount();
    }

    /**
     * Re-render at the top of the next hour.
     *
     * Which bar is "now" changes with the clock, not with a state, so nothing would tell the widget to redraw
     * itself. One timer per hour is enough - the prices themselves arrive through the subscribed datapoint.
     */
    scheduleHourChange(): void {
        this.hourTimer && clearTimeout(this.hourTimer);
        const next = new Date();
        next.setMinutes(0, 1, 0);
        next.setHours(next.getHours() + 1);

        this.hourTimer = setTimeout(
            () => {
                this.hourTimer = null;
                this.setState({ nowHour: Date.now() });
                this.scheduleHourChange();
            },
            Math.max(next.getTime() - Date.now(), 1000),
        );
    }

    /**
     * Find the field of a record that holds the time or the price.
     *
     * The adapters that deliver exchange prices (tibberlink, awattar, epex-spot, smartenergy, …) all store an
     * array of records, but every one of them names the fields differently. Rather than asking the user for a
     * field name in the normal case, the known names are tried in order - and the two attributes stay there for
     * everything else.
     *
     * @param record - one entry of the array
     * @param configured - the field name from the widget configuration, wins when it is set
     * @param candidates - field names to try
     * @returns The name of the field, or null when none of them fits
     */
    static detectField(record: Record<string, unknown>, configured: string, candidates: string[]): string | null {
        if (configured && record[configured] !== undefined) {
            return configured;
        }
        return candidates.find(name => record[name] !== undefined) ?? null;
    }

    /**
     * Read the price curve out of the configured datapoint.
     *
     * Accepted are a JSON string or an already parsed array, holding either records (`{ startsAt, total }`) or
     * plain numbers - a plain array of 24 numbers is read as "one value per hour of today".
     *
     * @returns The prices, sorted by time; empty when nothing could be read
     */
    getPrices(): PricePoint[] {
        const oid = cleanOid(this.state.rxData['prices-oid']);
        if (!oid) {
            return [];
        }

        const raw = this.state.values[`${oid}.val`];
        if (raw === null || raw === undefined || raw === '') {
            return [];
        }

        let parsed: unknown = raw;
        if (typeof raw === 'string') {
            try {
                parsed = JSON.parse(raw);
            } catch {
                return [];
            }
        }

        // Some adapters wrap the array, e.g. `{ prices: [...] }` or `{ today: [...] }`
        if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
            const wrapper = parsed as Record<string, unknown>;
            const inner = ['prices', 'today', 'data', 'values', 'result'].find(key => Array.isArray(wrapper[key]));
            parsed = inner ? wrapper[inner] : null;
        }

        if (!Array.isArray(parsed) || !parsed.length) {
            return [];
        }

        const factor = parseFloat(this.state.rxData.factor as string) || 1;

        // A plain list of numbers: one per hour, starting at midnight of today
        if (typeof parsed[0] === 'number') {
            const midnight = new Date();
            midnight.setHours(0, 0, 0, 0);
            return (parsed as number[]).map((price, index) => ({
                start: midnight.getTime() + index * 3600_000,
                price: price * factor,
            }));
        }

        const first = parsed[0] as Record<string, unknown>;
        const timeField = DynamicPrice.detectField(first, this.state.rxData.timeField, TIME_FIELDS);
        const priceField = DynamicPrice.detectField(first, this.state.rxData.priceField, PRICE_FIELDS);
        if (!timeField || !priceField) {
            return [];
        }

        const points: PricePoint[] = [];
        for (const entry of parsed as Record<string, unknown>[]) {
            const rawTime = entry[timeField];
            const price = toNumber(entry[priceField]);
            if (price === null) {
                continue;
            }
            // The time is a timestamp in milliseconds, in seconds, or an ISO string
            let start: number;
            if (typeof rawTime === 'number') {
                start = rawTime < 1e12 ? rawTime * 1000 : rawTime;
            } else {
                start = new Date(String(rawTime)).getTime();
            }
            if (!Number.isFinite(start)) {
                continue;
            }
            points.push({ start, price: price * factor });
        }

        return points.sort((a, b) => a.start - b.start);
    }

    /**
     * The hours that are actually drawn
     *
     * @param all - everything the datapoint delivered
     * @returns The selected window
     */
    selectHours(all: PricePoint[]): PricePoint[] {
        let points = all;

        if (this.state.rxData.onlyFuture !== false) {
            const currentHour = new Date();
            currentHour.setMinutes(0, 0, 0);
            const from = currentHour.getTime();
            const future = points.filter(point => point.start >= from);
            // Never show an empty chart just because the data is old
            if (future.length) {
                points = future;
            }
        }

        const count = parseInt(this.state.rxData.hoursCount as unknown as string, 10);
        if (count > 0 && points.length > count) {
            points = points.slice(0, count);
        }

        return points;
    }

    /**
     * Color of one bar
     *
     * @param point - the hour
     * @param points - all shown hours
     * @param isCurrent - whether this is the hour that is running
     * @returns A CSS color
     */
    getBarColor(point: PricePoint, points: PricePoint[], isCurrent: boolean): string {
        if (isCurrent) {
            return this.state.rxData.currentColor || '#1e88e5';
        }

        const cheap = this.state.rxData.cheapColor || '#43a047';
        const normal = this.state.rxData.normalColor || '#90a4ae';
        const expensive = this.state.rxData.expensiveColor || '#e53935';
        const mode = this.state.rxData.highlight || 'rank';

        if (mode === 'none') {
            return normal;
        }

        if (mode === 'average') {
            const average = points.reduce((sum, item) => sum + item.price, 0) / (points.length || 1);
            const tolerance = (this.state.rxData.averageTolerance ?? 10) / 100;
            if (point.price < average * (1 - tolerance)) {
                return cheap;
            }
            if (point.price > average * (1 + tolerance)) {
                return expensive;
            }
            return normal;
        }

        const sorted = [...points].sort((a, b) => a.price - b.price);
        const cheapCount = this.state.rxData.cheapCount ?? 3;
        const expensiveCount = this.state.rxData.expensiveCount ?? 3;

        if (cheapCount && sorted.slice(0, cheapCount).some(item => item.start === point.start)) {
            return cheap;
        }
        if (expensiveCount && sorted.slice(-expensiveCount).some(item => item.start === point.start)) {
            return expensive;
        }
        return normal;
    }

    /** The hour that is running right now, or null when it is not in the shown window */
    getCurrent(points: PricePoint[]): PricePoint | null {
        const now = Date.now();
        return points.find(point => now >= point.start && now < point.start + 3600_000) ?? null;
    }

    /**
     * @param value - a price
     * @returns The price with its unit
     */
    formatPrice(value: number): string {
        return `${formatNumber(value, this.state.rxData.decimals ?? 1)} ${this.state.rxData.unit || ''}`.trim();
    }

    getOption(points: PricePoint[]): Record<string, any> {
        const current = this.getCurrent(points);
        const average = points.reduce((sum, item) => sum + item.price, 0) / (points.length || 1);
        const axisColor = this.props.context.themeType === 'dark' ? '#ddd' : '#222';

        return {
            backgroundColor: 'transparent',
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: Array<{ dataIndex: number }>): string => {
                    const point = points[params[0]?.dataIndex];
                    if (!point) {
                        return '';
                    }
                    const start = new Date(point.start);
                    const end = new Date(point.start + 3600_000);
                    const hh = (date: Date): string => date.getHours().toString().padStart(2, '0');
                    return `${hh(start)}:00 – ${hh(end)}:00<br/>${this.formatPrice(point.price)}`;
                },
            },
            grid: { containLabel: true, left: 6, top: 10, right: 6, bottom: 6 },
            xAxis: {
                type: 'category',
                axisLabel: { color: axisColor, interval: points.length > 16 ? 2 : 0 },
                data: points.map(point => new Date(point.start).getHours().toString().padStart(2, '0')),
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: axisColor,
                    formatter: (value: number) => formatNumber(value, 0),
                },
                splitLine: { lineStyle: { opacity: 0.2 } },
            },
            series: [
                {
                    type: 'bar',
                    data: points.map(point => ({
                        value: point.price,
                        itemStyle: {
                            color: this.getBarColor(point, points, !!current && current.start === point.start),
                            borderRadius: [2, 2, 0, 0],
                        },
                    })),
                    markLine:
                        this.state.rxData.showAverage !== false && points.length
                            ? {
                                  silent: true,
                                  symbol: 'none',
                                  label: {
                                      // The default position sits outside the grid and is clipped away
                                      position: 'insideEndTop',
                                      formatter: () => this.formatPrice(average),
                                      color: axisColor,
                                      fontSize: 11,
                                  },
                                  lineStyle: { type: 'dashed', color: axisColor, opacity: 0.6 },
                                  data: [{ yAxis: average }],
                              }
                            : undefined,
                },
            ],
        };
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        if (!this.refContent.current) {
            setTimeout(() => this.sizeWatcher.observe(this.refContent.current), 50);
        }

        const points = this.selectHours(this.getPrices());
        const current = this.getCurrent(points);
        const showCurrent = this.state.rxData.showCurrent !== false;
        const headerHeight = showCurrent ? 24 : 0;
        const size = Math.max((this.state.chartHeight || 0) - headerHeight, 0);

        const content = (
            <div
                ref={this.refContent}
                style={styles.content}
            >
                {showCurrent ? (
                    <div style={styles.current}>{current ? this.formatPrice(current.price) : '--'}</div>
                ) : null}
                {points.length ? (
                    size > 20 ? (
                        <ReactEchartsCore
                            option={this.getOption(points)}
                            notMerge
                            theme={this.props.context.themeType === 'dark' ? 'dark' : ''}
                            opts={{ renderer: 'svg' }}
                            style={{ height: size, width: '100%' }}
                        />
                    ) : null
                ) : (
                    <div style={styles.hint}>{Generic.t('no_prices')}</div>
                )}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

export default DynamicPrice;
