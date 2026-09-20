import React from 'react';

import ReactEchartsCore from 'echarts-for-react';
import moment from 'moment';

import { I18n } from '@iobroker/gui-components';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    SingleWidgetId,
    VisBaseWidgetState,
    VisRxData,
    VisRxWidgetProps,
    VisRxWidgetState,
    WidgetData,
} from '@iobroker/types-vis-2';

import Generic from './Generic';
import { cleanOid, formatNumber, getFromToTime, getIntervalSteps, type TimeIntervalType } from './Utils';
import { readSeries, type AggregateType, type HistoryPoint } from './History';
import { TimeSelectorSubscriber } from './TimeWidget';
import { SizeWatcher } from './SizeWatcher';

interface ConsumptionState extends VisRxWidgetState {
    loading?: boolean;
    chartHeight?: number;
    [key: `history${number}`]: HistoryPoint[];
}

interface ConsumptionRxData extends VisRxData {
    noCard: boolean;
    stacked: boolean;
    chartType: 'bar' | 'line' | 'area';
    showLegend: boolean;
    showToolbox: boolean;
    decimals: number;
    widgetTitle: string;
    devicesCount: number;
    timeWidget: SingleWidgetId;
    'start-oid': string;
    'interval-oid': string;
    aggregate: AggregateType;
    difference: boolean;
    percentile: number;
    quantile: number;
    integralUnit: number;
    integralInterpolation?: 'none' | 'linear';
    [key: `oid${string}`]: string;
    [key: `name${string}`]: string | undefined;
    [key: `color${string}`]: string | undefined;
    [key: `unit${string}`]: string | undefined;
    [key: `factor${string}`]: string | number | undefined;
}

const styles: Record<string, React.CSSProperties> = {
    cardContent: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
};

/** Label format of the x-axis per period */
const AXIS_FORMAT: Record<string, string> = {
    year: 'MMM',
    month: 'DD.MM',
    week: 'ddd',
    day: 'HH:00',
};

/** How often the chart of the running period is read again */
const LIVE_UPDATE_MS = 10 * 60 * 1000;

class Consumption extends Generic<ConsumptionRxData, ConsumptionState> {
    private readonly refCardContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    private readonly sizeWatcher = new SizeWatcher((_width, height) => {
        if (height && height !== this.state.chartHeight) {
            this.setState({ chartHeight: height });
        }
    });

    private readonly timeSelector = new TimeSelectorSubscriber(() => this.readCharts());

    private readTimer?: ReturnType<typeof setTimeout> | null = null;

    private chartUpdateInterval?: ReturnType<typeof setInterval> | null = null;

    private lastUpdate?: number;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2Consumption',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'consumption', // Label of widget
            visHelp: 'help_consumption', // Description in the palette
            visName: 'Consumption',
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
                            name: 'chartType',
                            label: 'chart_type',
                            type: 'select',
                            tooltip: 'chart_type_tooltip',
                            default: 'bar',
                            options: [
                                { value: 'bar', label: 'bar' },
                                { value: 'line', label: 'line' },
                                { value: 'area', label: 'area' },
                            ],
                        },
                        {
                            name: 'stacked',
                            label: 'stacked',
                            type: 'checkbox',
                            tooltip: 'stacked_tooltip',
                            default: true,
                        },
                        {
                            name: 'showLegend',
                            label: 'legend',
                            type: 'checkbox',
                            tooltip: 'consumption_legend_tooltip',
                            default: true,
                        },
                        {
                            name: 'showToolbox',
                            label: 'show_toolbox',
                            type: 'checkbox',
                            tooltip: 'show_toolbox_tooltip',
                            default: true,
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
                            name: 'devicesCount',
                            type: 'number',
                            label: 'devices_count',
                            tooltip: 'devices_count_tooltip',
                            default: 1,
                        },
                        {
                            name: 'timeWidget',
                            type: 'widget',
                            label: 'time_widget',
                            tooltip: 'time_widget_tooltip',
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
                    ],
                },
                {
                    name: 'aggregation',
                    label: 'aggregation',
                    fields: [
                        {
                            name: 'aggregate',
                            label: 'aggregate',
                            type: 'select',
                            noTranslation: true,
                            tooltip: 'aggregate_tooltip',
                            options: [
                                'minmax',
                                'max',
                                'min',
                                'average',
                                'total',
                                'count',
                                'percentile',
                                'quantile',
                                'integral',
                                'none',
                            ],
                            default: 'max',
                        },
                        {
                            name: 'difference',
                            label: 'difference',
                            type: 'checkbox',
                            tooltip: 'difference_tooltip',
                            hidden: (data: WidgetData) =>
                                data.aggregate !== 'max' &&
                                data.aggregate !== 'min' &&
                                data.aggregate !== 'average' &&
                                data.aggregate !== 'none' &&
                                data.aggregate !== 'integral',
                        },
                        {
                            name: 'percentile',
                            default: 50,
                            type: 'number',
                            label: 'percentile',
                            tooltip: 'percentile_tooltip',
                            hidden: (data: WidgetData) => data.aggregate !== 'percentile',
                        },
                        {
                            name: 'quantile',
                            default: 0.5,
                            type: 'number',
                            label: 'quantile',
                            tooltip: 'quantile_tooltip',
                            hidden: (data: WidgetData) => data.aggregate !== 'quantile',
                        },
                        {
                            name: 'integralUnit',
                            default: 60,
                            type: 'number',
                            label: 'integral_unit',
                            tooltip: 'integral_unit_tooltip',
                            hidden: (data: WidgetData) => data.aggregate !== 'integral',
                        },
                        {
                            name: 'integralInterpolation',
                            default: 'none',
                            type: 'select',
                            options: ['linear', 'none'],
                            label: 'integral_interpolation',
                            tooltip: 'integral_interpolation_tooltip',
                            hidden: (data: WidgetData) => data.aggregate !== 'integral',
                        },
                    ],
                },
                {
                    name: 'devices',
                    label: 'Value',
                    indexFrom: 1,
                    indexTo: 'devicesCount',
                    fields: [
                        {
                            name: 'oid',
                            type: 'hid',
                            label: 'oid',
                            tooltip: 'consumption_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name!]);
                                const common = object?.common as ioBroker.StateCommon | undefined;
                                if (common) {
                                    data[`color${field.index}`] = common.color ?? null;
                                    data[`name${field.index}`] =
                                        common.name && typeof common.name === 'object'
                                            ? common.name[I18n.getLanguage()]
                                            : common.name;
                                    // The unit of the datapoint is a good default for the axis label
                                    data[`unit${field.index}`] ||= common.unit ?? '';
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'name',
                            label: 'name',
                            tooltip: 'series_name_tooltip',
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                            tooltip: 'series_color_tooltip',
                        },
                        {
                            name: 'unit',
                            label: 'unit',
                            tooltip: 'series_unit_tooltip',
                        },
                        {
                            name: 'factor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 320,
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_consumption.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return Consumption.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sizeWatcher.observe(this.refCardContent.current);
        this.timeSelector.connect(this.state.rxData.timeWidget);
        this.readCharts();
    }

    componentDidUpdate(
        prevProps: VisRxWidgetProps,
        prevState: Readonly<ConsumptionState & { rxData: ConsumptionRxData } & VisBaseWidgetState>,
    ): void {
        super.componentDidUpdate(prevProps, prevState);

        this.sizeWatcher.observe(this.refCardContent.current);
        this.timeSelector.connect(this.state.rxData.timeWidget);

        if (
            this.props.context.timeStart !== prevProps.context.timeStart ||
            this.props.context.timeInterval !== prevProps.context.timeInterval
        ) {
            this.readCharts();
        }

        // The running period has to be refreshed now and then; a period in the past never changes
        if (!this.getTimeStart() && !this.chartUpdateInterval) {
            this.chartUpdateInterval = setInterval(() => this.readCharts(), LIVE_UPDATE_MS);
        }
        if (this.getTimeStart() && this.chartUpdateInterval) {
            clearInterval(this.chartUpdateInterval);
            this.chartUpdateInterval = null;
        }
    }

    componentWillUnmount(): void {
        this.timeSelector.destroy();
        this.sizeWatcher.disconnect();

        this.readTimer && clearTimeout(this.readTimer);
        this.readTimer = null;

        this.chartUpdateInterval && clearInterval(this.chartUpdateInterval);
        this.chartUpdateInterval = null;

        super.componentWillUnmount();
    }

    onStateUpdated(): void {
        const interval = getFromToTime(this.getTimeStart(), this.getTimeInterval());
        // read only if interval is not in the past
        if (interval.to.getTime() >= Date.now() && (!this.lastUpdate || Date.now() - this.lastUpdate > 60_000)) {
            this.lastUpdate = Date.now();
            this.readCharts();
        }
    }

    onRxDataChanged(): void {
        this.readCharts();
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

        return result || 0;
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

    readCharts(): void {
        this.readTimer && clearTimeout(this.readTimer);
        this.readTimer = setTimeout(() => {
            this.readTimer = null;
            void this._readCharts();
        }, 200);
    }

    async _readCharts(): Promise<void> {
        const intervalType = this.getTimeInterval();
        const interval = getFromToTime(this.getTimeStart(), intervalType);
        const steps = getIntervalSteps(intervalType, interval.from);
        const instance = this.props.context.systemConfig?.common?.defaultHistory || 'history.0';

        this.setState({ loading: true });

        const newState: Partial<ConsumptionState> = { loading: false };

        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            const oid = cleanOid(this.state.rxData[`oid${i}`]);
            if (!oid) {
                newState[`history${i}`] = [];
                continue;
            }

            newState[`history${i}`] = await readSeries({
                socket: this.props.context.socket,
                id: oid,
                instance,
                from: interval.from,
                to: interval.to,
                steps,
                aggregate: this.state.rxData.aggregate || 'max',
                difference: !!this.state.rxData.difference,
                percentile: this.state.rxData.percentile,
                quantile: this.state.rxData.quantile,
                integralUnit: this.state.rxData.integralUnit,
                integralInterpolation: this.state.rxData.integralInterpolation,
            });
        }

        this.setState(newState as ConsumptionState & { rxData: ConsumptionRxData } & VisBaseWidgetState);
    }

    /** One entry per configured device, with the values already multiplied by the factor */
    getSeriesData(): Array<{ name: string; unit: string; color: string; values: HistoryPoint[]; factor: number }> {
        const data = [];
        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            const factor = parseFloat(this.state.rxData[`factor${i}`] as string) || 1;
            data.push({
                name: this.state.rxData[`name${i}`] || cleanOid(this.state.rxData[`oid${i}`]) || `#${i}`,
                unit: this.state.rxData[`unit${i}`] || '',
                color: this.state.rxData[`color${i}`] || '',
                values: (this.state[`history${i}`] || []).map(point => ({
                    ts: point.ts,
                    val: point.val * factor,
                })),
                factor,
            });
        }
        return data;
    }

    /**
     * @returns The echarts option of the chart
     */
    getOption(): Record<string, any> {
        const data = this.getSeriesData();
        // use the first configured device unit as the y-axis label (#451)
        const axisUnit = data.find(item => item.unit)?.unit || '';
        const decimals = this.state.rxData.decimals ?? 1;
        const chartType = this.state.rxData.chartType || 'bar';
        const stacked = this.state.rxData.stacked !== false;

        const textStyle = {
            color: this.props.context.themeType === 'dark' ? '#ddd' : '#222',
        };
        const showLegend = this.state.rxData.showLegend !== false;

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: chartType === 'bar' ? 'shadow' : 'line' },
                // The values of the series may have different units, so every row is formatted on its own
                // instead of letting echarts append one unit to all of them
                formatter: (params: Array<{ seriesIndex: number; axisValueLabel: string; value: number }>): string => {
                    const rows = params.map(param => {
                        const series = data[param.seriesIndex];
                        const unit = series?.unit ? ` ${series.unit}` : '';
                        return `${series?.name || ''}: ${formatNumber(param.value, decimals)}${unit}`;
                    });
                    return [params[0]?.axisValueLabel, ...rows].filter(row => row).join('<br/>');
                },
            },
            legend: {
                show: showLegend,
                top: 5,
                left: 'center',
                data: data.map(item => ({
                    name: item.name,
                    textStyle,
                })),
            },
            toolbox: {
                show: this.state.rxData.showToolbox !== false,
                feature: {
                    magicType: {
                        type: ['stack'],
                    },
                    dataView: {},
                },
            },
            grid: {
                containLabel: true,
                left: 10,
                top: showLegend ? 40 : 20,
                right: 10,
                bottom: 10,
            },
            yAxis: { name: axisUnit, axisLabel: { formatter: (value: number) => formatNumber(value, 0) } },
            xAxis: {
                type: 'category',
                data: data?.[0]?.values?.map(dateValue =>
                    moment(dateValue.ts).format(AXIS_FORMAT[this.getTimeInterval()]),
                ),
            },
            series: data.map(item => ({
                type: chartType === 'bar' ? 'bar' : 'line',
                name: item.name,
                smooth: chartType !== 'bar',
                areaStyle: chartType === 'area' ? {} : undefined,
                itemStyle: {
                    color: item.color || undefined,
                },
                data: item.values?.map(dateValue => dateValue.val),
                stack: stacked ? 'one' : undefined,
            })),
        };
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        // The very first render has no ref yet, so ask for one more to pick the height up
        if (!this.refCardContent.current) {
            setTimeout(() => this.sizeWatcher.observe(this.refCardContent.current), 50);
        }
        const size = this.state.chartHeight;

        const content = (
            <div
                ref={this.refCardContent}
                style={styles.cardContent}
            >
                {size ? (
                    <ReactEchartsCore
                        option={this.getOption()}
                        notMerge
                        showLoading={!!this.state.loading}
                        theme={this.props.context.themeType === 'dark' ? 'dark' : ''}
                        style={{ height: `${size}px`, width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                ) : null}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

export default Consumption;
