import React from 'react';

import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    SingleWidgetId,
    VisRxData,
    VisRxWidgetState,
    WidgetData,
} from '@iobroker/types-vis-2';

import Generic from './Generic';
import {
    cleanOid,
    formatNumber,
    getFromToTime,
    getIntervalSteps,
    getMonthFraction,
    toNumber,
    type TimeIntervalType,
} from './Utils';
import { readSeries, type AggregateType } from './History';
import { TimeSelectorSubscriber } from './TimeWidget';

interface EnergyCostsState extends VisRxWidgetState {
    /** Energy read from history, per source; only used in `history` mode */
    historyConsumption?: number | null;
    historyFeedIn?: number | null;
    loading?: boolean;
}

interface EnergyCostsRxData extends VisRxData {
    noCard: boolean;
    widgetTitle: string;
    source: 'value' | 'history';
    decimals: number;
    energyDecimals: number;
    currency: string;
    energyUnit: string;
    showEnergy: boolean;
    showDetails: boolean;
    costColor: string;
    revenueColor: string;

    'consumption-oid': string;
    consumptionFactor: number | string;
    price: number | string;
    'price-oid': string;

    'feedIn-oid': string;
    feedInFactor: number | string;
    feedInPrice: number | string;
    'feedInPrice-oid': string;

    baseFee: number | string;

    timeWidget: SingleWidgetId;
    'start-oid': string;
    'interval-oid': string;
    aggregate: AggregateType;
    difference: boolean;
}

/** The whole calculation, ready to be printed */
interface CostResult {
    consumption: number | null;
    feedIn: number | null;
    price: number;
    feedInPrice: number;
    cost: number;
    revenue: number;
    baseFee: number;
    balance: number;
}

const styles: Record<string, React.CSSProperties> = {
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        padding: '0 8px',
        boxSizing: 'border-box',
    },
    balance: {
        fontSize: '1.9em',
        fontWeight: 'bold',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.2,
    },
    period: {
        textAlign: 'center',
        opacity: 0.7,
        fontSize: '0.8em',
        whiteSpace: 'nowrap',
    },
    rows: {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        columnGap: 12,
        marginTop: 8,
        minHeight: 0,
        overflow: 'auto',
    },
    rowName: {
        opacity: 0.8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        // The card centers its content, which would leave the names floating in the middle of their column
        textAlign: 'left',
    },
    rowValue: {
        textAlign: 'right',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
    },
};

class EnergyCosts extends Generic<EnergyCostsRxData, EnergyCostsState> {
    private readonly timeSelector = new TimeSelectorSubscriber(() => this.readHistory());

    private readTimer?: ReturnType<typeof setTimeout> | null = null;

    private liveUpdateInterval?: ReturnType<typeof setInterval> | null = null;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2EnergyCosts',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'energy_costs', // Label of widget
            visHelp: 'help_energy_costs', // Description in the palette
            visName: 'Energy costs',
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
                            name: 'source',
                            label: 'cost_source',
                            type: 'select',
                            tooltip: 'cost_source_tooltip',
                            default: 'value',
                            options: [
                                { value: 'value', label: 'cost_source_value' },
                                { value: 'history', label: 'cost_source_history' },
                            ],
                        },
                        {
                            name: 'currency',
                            label: 'currency',
                            default: '€',
                            tooltip: 'currency_tooltip',
                        },
                        {
                            name: 'energyUnit',
                            label: 'energy_unit',
                            default: 'kWh',
                            tooltip: 'energy_unit_tooltip',
                        },
                        {
                            name: 'decimals',
                            label: 'decimals',
                            type: 'slider',
                            min: 0,
                            max: 4,
                            default: 2,
                            tooltip: 'cost_decimals_tooltip',
                        },
                        {
                            name: 'energyDecimals',
                            label: 'energy_decimals',
                            type: 'slider',
                            min: 0,
                            max: 4,
                            default: 1,
                            tooltip: 'energy_decimals_tooltip',
                        },
                        {
                            name: 'showDetails',
                            label: 'show_details',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'show_details_tooltip',
                        },
                        {
                            name: 'showEnergy',
                            label: 'show_energy',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'show_energy_tooltip',
                            hidden: (data: WidgetData) => !data.showDetails,
                        },
                        {
                            name: 'costColor',
                            label: 'cost_color',
                            type: 'color',
                            tooltip: 'cost_color_tooltip',
                        },
                        {
                            name: 'revenueColor',
                            label: 'revenue_color',
                            type: 'color',
                            default: '#43a047',
                            tooltip: 'revenue_color_tooltip',
                        },
                    ],
                },
                {
                    name: 'consumption',
                    label: 'group_consumption',
                    fields: [
                        {
                            name: 'consumption-oid',
                            label: 'energy_oid',
                            type: 'id',
                            tooltip: 'energy_oid_tooltip',
                        },
                        {
                            name: 'consumptionFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'price',
                            label: 'price',
                            type: 'number',
                            default: 0.3,
                            tooltip: 'price_tooltip',
                        },
                        {
                            name: 'price-oid',
                            label: 'price_oid',
                            type: 'id',
                            tooltip: 'price_oid_tooltip',
                        },
                        {
                            name: 'baseFee',
                            label: 'base_fee',
                            type: 'number',
                            tooltip: 'base_fee_tooltip',
                        },
                    ],
                },
                {
                    name: 'feedIn',
                    label: 'group_feed_in',
                    fields: [
                        {
                            name: 'feedIn-oid',
                            label: 'feed_in_oid',
                            type: 'id',
                            tooltip: 'feed_in_oid_tooltip',
                        },
                        {
                            name: 'feedInFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'feedInPrice',
                            label: 'feed_in_price',
                            type: 'number',
                            default: 0.08,
                            tooltip: 'feed_in_price_tooltip',
                        },
                        {
                            name: 'feedInPrice-oid',
                            label: 'feed_in_price_oid',
                            type: 'id',
                            tooltip: 'feed_in_price_oid_tooltip',
                        },
                    ],
                },
                {
                    name: 'period',
                    label: 'group_period',
                    fields: [
                        {
                            name: 'timeWidget',
                            type: 'widget',
                            label: 'time_widget',
                            tooltip: 'costs_time_widget_tooltip',
                            tpl: 'tplEnergy2IntervalSelector',
                        },
                        {
                            name: 'start-oid',
                            type: 'id',
                            hidden: (data: WidgetData) => !!data.timeWidget,
                            label: 'start_oid',
                            tooltip: 'start_oid_tooltip',
                        },
                        {
                            name: 'interval-oid',
                            type: 'id',
                            hidden: (data: WidgetData) => !data['start-oid'] || !!data.timeWidget,
                            label: 'interval_oid',
                            tooltip: 'interval_oid_tooltip',
                        },
                        {
                            name: 'aggregate',
                            label: 'aggregate',
                            type: 'select',
                            noTranslation: true,
                            tooltip: 'aggregate_tooltip',
                            options: ['max', 'min', 'average', 'total', 'none'],
                            default: 'max',
                            hidden: (data: WidgetData) => data.source !== 'history',
                        },
                        {
                            name: 'difference',
                            label: 'difference',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'difference_tooltip',
                            hidden: (data: WidgetData) => data.source !== 'history',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 260,
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_energy_costs.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return EnergyCosts.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.timeSelector.connect(this.state.rxData.timeWidget);
        this.readHistory();
    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);
        this.timeSelector.connect(this.state.rxData.timeWidget);

        if (
            this.props.context.timeStart !== prevProps.context.timeStart ||
            this.props.context.timeInterval !== prevProps.context.timeInterval
        ) {
            this.readHistory();
        }

        const live = this.state.rxData.source === 'history' && !this.getTimeStart();
        if (live && !this.liveUpdateInterval) {
            this.liveUpdateInterval = setInterval(() => this.readHistory(), 10 * 60 * 1000);
        }
        if (!live && this.liveUpdateInterval) {
            clearInterval(this.liveUpdateInterval);
            this.liveUpdateInterval = null;
        }
    }

    componentWillUnmount(): void {
        this.timeSelector.destroy();
        this.readTimer && clearTimeout(this.readTimer);
        this.readTimer = null;
        this.liveUpdateInterval && clearInterval(this.liveUpdateInterval);
        this.liveUpdateInterval = null;
        super.componentWillUnmount();
    }

    onRxDataChanged(): void {
        this.readHistory();
    }

    getTimeStart(): number {
        let result;
        if (this.state.rxData.timeWidget) {
            result = this.timeSelector.value?.start;
        } else if (this.state.rxData['start-oid']) {
            result = this.state.values[`${this.state.rxData['start-oid']}.val`];
        } else {
            result = this.props.context.timeStart;
        }
        return (result as number) || 0;
    }

    getTimeInterval(): TimeIntervalType {
        let result;
        if (this.state.rxData.timeWidget) {
            result = this.timeSelector.value?.interval;
        } else if (this.state.rxData['start-oid'] && this.state.rxData['interval-oid']) {
            result = this.state.values[`${this.state.rxData['interval-oid']}.val`];
        } else {
            result = this.props.context.timeInterval;
        }
        return (result as TimeIntervalType) || 'day';
    }

    readHistory(): void {
        this.readTimer && clearTimeout(this.readTimer);
        this.readTimer = setTimeout(() => {
            this.readTimer = null;
            void this._readHistory();
        }, 200);
    }

    async _readHistory(): Promise<void> {
        if (this.state.rxData.source !== 'history') {
            return;
        }

        const intervalType = this.getTimeInterval();
        const interval = getFromToTime(this.getTimeStart(), intervalType);
        const steps = getIntervalSteps(intervalType, interval.from);
        const instance = this.props.context.systemConfig?.common?.defaultHistory || 'history.0';

        this.setState({ loading: true });

        const read = async (oid: string): Promise<number | null> => {
            if (!oid) {
                return null;
            }
            const series = await readSeries({
                socket: this.props.context.socket,
                id: oid,
                instance,
                from: interval.from,
                to: interval.to,
                steps,
                aggregate: this.state.rxData.aggregate || 'max',
                difference: this.state.rxData.difference !== false,
            });
            return series.reduce((sum, point) => sum + (Number.isFinite(point.val) ? point.val : 0), 0);
        };

        const historyConsumption = await read(cleanOid(this.state.rxData['consumption-oid']));
        const historyFeedIn = await read(cleanOid(this.state.rxData['feedIn-oid']));

        this.setState({ historyConsumption, historyFeedIn, loading: false });
    }

    /**
     * A price, either from its own datapoint or from the fixed number in the configuration
     *
     * @param oidField - name of the `id` attribute with the price datapoint
     * @param numberField - name of the number attribute with the fixed price
     * @returns The price per energy unit
     */
    getPrice(oidField: keyof EnergyCostsRxData, numberField: keyof EnergyCostsRxData): number {
        const oid = cleanOid(this.state.rxData[oidField] as string);
        if (oid) {
            const value = toNumber(this.state.values[`${oid}.val`]);
            if (value !== null) {
                return value;
            }
        }
        return parseFloat(this.state.rxData[numberField] as string) || 0;
    }

    /**
     * Energy of the shown period
     *
     * @param oidField - name of the `id` attribute
     * @param factorField - name of the number attribute with the multiplier
     * @param fromHistory - what the history read returned for this source
     * @returns The energy, or null when nothing is configured
     */
    getEnergy(
        oidField: keyof EnergyCostsRxData,
        factorField: keyof EnergyCostsRxData,
        fromHistory: number | null | undefined,
    ): number | null {
        const factor = parseFloat(this.state.rxData[factorField] as string) || 1;

        if (this.state.rxData.source === 'history') {
            return fromHistory === null || fromHistory === undefined ? null : fromHistory * factor;
        }

        const oid = cleanOid(this.state.rxData[oidField] as string);
        if (!oid) {
            return null;
        }
        const value = toNumber(this.state.values[`${oid}.val`]);
        return value === null ? null : value * factor;
    }

    /**
     * Everything the widget shows
     *
     * @returns Energy, prices, the three cost positions and the balance
     */
    calculate(): CostResult {
        const consumption = this.getEnergy('consumption-oid', 'consumptionFactor', this.state.historyConsumption);
        const feedIn = this.getEnergy('feedIn-oid', 'feedInFactor', this.state.historyFeedIn);

        const price = this.getPrice('price-oid', 'price');
        const feedInPrice = this.getPrice('feedInPrice-oid', 'feedInPrice');

        const cost = (consumption ?? 0) * price;
        const revenue = (feedIn ?? 0) * feedInPrice;

        // The base fee is given per month, so it is spread over whatever period is shown
        const monthlyFee = parseFloat(this.state.rxData.baseFee as string) || 0;
        const interval = getFromToTime(this.getTimeStart(), this.getTimeInterval());
        const baseFee = monthlyFee * getMonthFraction(this.getTimeInterval(), interval.from);

        return {
            consumption,
            feedIn,
            price,
            feedInPrice,
            cost,
            revenue,
            baseFee,
            balance: cost + baseFee - revenue,
        };
    }

    /**
     * A money amount with its currency
     *
     * @param value - the amount
     * @returns The formatted amount
     */
    money(value: number): string {
        return `${formatNumber(value, this.state.rxData.decimals ?? 2)} ${this.state.rxData.currency || '€'}`;
    }

    /**
     * An energy amount with its unit
     *
     * @param value - the amount
     * @returns The formatted amount
     */
    energy(value: number | null): string {
        return `${formatNumber(value, this.state.rxData.energyDecimals ?? 1)} ${this.state.rxData.energyUnit || 'kWh'}`;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const result = this.calculate();
        const rows: Array<[string, string]> = [];

        if (this.state.rxData.showDetails) {
            if (this.state.rxData.showEnergy && result.consumption !== null) {
                rows.push([Generic.t('consumption'), this.energy(result.consumption)]);
            }
            if (result.consumption !== null) {
                rows.push([Generic.t('costs'), this.money(result.cost)]);
            }
            if (result.baseFee) {
                rows.push([Generic.t('base_fee'), this.money(result.baseFee)]);
            }
            if (result.feedIn !== null) {
                if (this.state.rxData.showEnergy) {
                    rows.push([Generic.t('feed_in'), this.energy(result.feedIn)]);
                }
                rows.push([Generic.t('revenue'), this.money(result.revenue)]);
            }
        }

        const isRevenue = result.balance < 0;
        const balanceColor = isRevenue
            ? this.state.rxData.revenueColor || '#43a047'
            : this.state.rxData.costColor || undefined;

        const content = (
            <div style={styles.content}>
                <div style={{ ...styles.balance, color: balanceColor }}>
                    {this.money(Math.abs(result.balance))}
                </div>
                <div style={styles.period}>
                    {Generic.t(isRevenue ? 'balance_credit' : 'balance_costs')} · {Generic.t(this.getTimeInterval())}
                </div>
                {rows.length ? (
                    <div style={styles.rows}>
                        {rows.map(([name, value]) => (
                            <React.Fragment key={name}>
                                <div style={styles.rowName}>{name}</div>
                                <div style={styles.rowValue}>{value}</div>
                            </React.Fragment>
                        ))}
                    </div>
                ) : null}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

export default EnergyCosts;
