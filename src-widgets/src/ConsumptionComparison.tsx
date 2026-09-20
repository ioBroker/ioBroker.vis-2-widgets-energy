import React from 'react';
import { Box, type SxProps } from '@mui/material';

import ReactEchartsCore from 'echarts-for-react';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxData, VisRxWidgetState, WidgetData } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { cleanOid, formatNumber, toNumber } from './Utils';
import { SizeWatcher } from './SizeWatcher';

interface ConsumptionComparisonState extends VisRxWidgetState {
    units?: string[];
    chartHeight?: number;
}

const styles: Record<string, SxProps> = {
    cardContent: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        '& .vis-2-widgets-energy-chart': {
            width: '100%',
            '&>div': {
                borderRadius: 5,
            },
        },
    },
};

interface ConsumptionComparisonRxData extends VisRxData {
    noCard: boolean;
    type: 'bar' | 'pie';
    orientation: 'horizontal' | 'vertical';
    sort: 'none' | 'asc' | 'desc';
    showValues: boolean;
    decimals: number;
    noAnimation: boolean;
    animationDuration: string;
    innerRadius: string | number;
    innerTitle: string;
    inner_oid: string;
    innerUnit: string;
    legend: boolean;
    legendHeight: number;
    hideLabels: boolean;
    precision: number;
    widgetTitle: string;
    devicesCount: number;

    // Dynamic fields for devices
    [key: `oid${string}`]: string;
    [key: `name${string}`]: string;
    [key: `color${string}`]: string;
    [key: `unit${string}`]: string;
    [key: `factor${string}`]: string | number;
}

/** One configured device, ready to be drawn */
interface ComparisonItem {
    name: string;
    value: number;
    color?: string;
    unit: string;
}

class ConsumptionComparison extends Generic<ConsumptionComparisonRxData, ConsumptionComparisonState> {
    private readonly refCardContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    private readonly sizeWatcher = new SizeWatcher((_width, height) => {
        if (height && height !== this.state.chartHeight) {
            this.setState({ chartHeight: height });
        }
    });

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2ConsumptionComparison',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'consumption_comparison', // Label of widget
            visHelp: 'help_consumption_comparison', // Description in the palette
            visName: 'Consumption comparison',
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
                            name: 'type',
                            label: 'type',
                            type: 'select',
                            tooltip: 'comparison_type_tooltip',
                            options: [
                                { value: 'bar', label: 'bar' },
                                { value: 'pie', label: 'pie' },
                            ],
                            default: 'bar',
                        },
                        {
                            name: 'devicesCount',
                            type: 'number',
                            label: 'devices_count',
                            tooltip: 'devices_count_tooltip',
                            min: 2,
                            default: 2,
                        },
                        {
                            name: 'sort',
                            label: 'sort',
                            type: 'select',
                            tooltip: 'sort_tooltip',
                            default: 'none',
                            options: [
                                { value: 'none', label: 'sort_none' },
                                { value: 'desc', label: 'sort_desc' },
                                { value: 'asc', label: 'sort_asc' },
                            ],
                        },
                        {
                            name: 'decimals',
                            label: 'decimals',
                            type: 'slider',
                            min: 0,
                            max: 4,
                            default: 2,
                            tooltip: 'decimals_tooltip',
                        },
                        {
                            name: 'noAnimation',
                            label: 'no_animation',
                            type: 'checkbox',
                            tooltip: 'no_animation_tooltip',
                        },
                        {
                            name: 'animationDuration',
                            label: 'animation_duration',
                            type: 'number',
                            tooltip: 'animation_duration_tooltip',
                            default: 1000,
                            hidden: (data: WidgetData) => !!data.noAnimation,
                        },
                    ],
                },
                {
                    name: 'bar',
                    label: 'group_bar',
                    hidden: 'data.type !== "bar"',
                    fields: [
                        {
                            name: 'orientation',
                            label: 'orientation',
                            type: 'select',
                            tooltip: 'orientation_tooltip',
                            default: 'horizontal',
                            options: [
                                { value: 'horizontal', label: 'orientation_horizontal' },
                                { value: 'vertical', label: 'orientation_vertical' },
                            ],
                        },
                        {
                            name: 'showValues',
                            label: 'show_values',
                            type: 'checkbox',
                            tooltip: 'show_values_tooltip',
                        },
                    ],
                },
                {
                    name: 'pie',
                    label: 'group_pie',
                    hidden: 'data.type !== "pie"',
                    fields: [
                        {
                            name: 'innerRadius',
                            label: 'inner_radius',
                            type: 'slider',
                            tooltip: 'inner_radius_tooltip',
                            min: 0,
                            max: 80,
                        },
                        {
                            name: 'innerTitle',
                            label: 'inner_title',
                            type: 'text',
                            tooltip: 'inner_title_tooltip',
                        },
                        {
                            name: 'inner_oid',
                            label: 'inner_oid',
                            type: 'id',
                            tooltip: 'inner_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = data[field.name!] ? await socket.getObject(data[field.name!]) : null;
                                const common = object?.common as ioBroker.StateCommon | undefined;
                                if (common?.unit) {
                                    data.innerUnit = common.unit;
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'innerUnit',
                            label: 'inner_unit',
                            type: 'text',
                            tooltip: 'inner_unit_tooltip',
                            hidden: '!data.inner_oid',
                        },
                        {
                            name: 'legend',
                            label: 'legend',
                            type: 'checkbox',
                            tooltip: 'legend_tooltip',
                        },
                        {
                            name: 'legendHeight',
                            label: 'legend_height',
                            type: 'slider',
                            tooltip: 'legend_height_tooltip',
                            min: 5,
                            max: 30,
                            default: 10,
                            hidden: '!data.legend',
                        },
                        {
                            name: 'hideLabels',
                            label: 'hide_Labels',
                            type: 'checkbox',
                            tooltip: 'hide_labels_tooltip',
                        },
                        {
                            name: 'precision',
                            label: 'precision',
                            type: 'slider',
                            tooltip: 'precision_tooltip',
                            min: 0,
                            max: 5,
                            default: 0,
                            hidden: '!!data.hideLabels',
                        },
                    ],
                },
                {
                    name: 'devices',
                    label: 'level',
                    indexFrom: 1,
                    indexTo: 'devicesCount',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                            label: 'oid',
                            tooltip: 'comparison_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = data[field.name!] ? await socket.getObject(data[field.name!]) : null;
                                if (object?.common) {
                                    data[`color${field.index}`] = object.common.color ?? null;
                                    data[`name${field.index}`] = Generic.getText(object.common.name);
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
                            type: 'select',
                            noTranslation: true,
                            options: [
                                { value: 1, label: '1' },
                                { value: 10, label: '10' },
                                { value: 100, label: '100' },
                                { value: 1000, label: '1000' },
                                { value: 0.1, label: '0.1' },
                                { value: 0.01, label: '0.01' },
                                { value: 0.001, label: '0.001' },
                            ],
                            default: '1',
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
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_consumption_comparison.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return ConsumptionComparison.getWidgetInfo();
    }

    async propertiesUpdate(): Promise<void> {
        const units: string[] = [];
        const ids: string[] = [];
        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            const oid = cleanOid(this.state.rxData[`oid${i}`]);
            if (!this.state.rxData[`unit${i}`] && oid) {
                ids.push(oid);
            }
        }
        const _objects = ids.length ? await this.props.context.socket.getObjectsById(ids) : {};

        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            if (!this.state.rxData[`unit${i}`]) {
                const common = _objects?.[cleanOid(this.state.rxData[`oid${i}`])]?.common as
                    | ioBroker.StateCommon
                    | undefined;
                if (common?.unit) {
                    units[i] = common.unit;
                }
            } else {
                units[i] = this.state.rxData[`unit${i}`];
            }
        }

        if (JSON.stringify(units) !== JSON.stringify(this.state.units)) {
            this.setState({ units });
        }
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sizeWatcher.observe(this.refCardContent.current);
        void this.propertiesUpdate();
    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);
        this.sizeWatcher.observe(this.refCardContent.current);
    }

    componentWillUnmount(): void {
        this.sizeWatcher.disconnect();
        super.componentWillUnmount();
    }

    onRxDataChanged(): void {
        void this.propertiesUpdate();
    }

    /**
     * Read every configured device once, with its own unit attached.
     *
     * The unit travels WITH the item on purpose: the chart draws the devices in reverse order, and the two
     * formatters used to look their unit up by the position in that reversed list (`units[dataIndex + 1]`).
     * Every device therefore showed the unit of a different one as soon as more than one unit was in play.
     *
     * @returns One entry per configured device, in configuration order
     */
    getItems(): ComparisonItem[] {
        const decimals = this.state.rxData.decimals ?? 2;
        const items: ComparisonItem[] = [];

        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            const factor = parseFloat(this.state.rxData[`factor${i}`] as string) || 1;
            const raw = toNumber(this.state.values[`${cleanOid(this.state.rxData[`oid${i}`])}.val`]) ?? 0;
            const rounded = Math.round(raw * factor * 10 ** decimals) / 10 ** decimals;

            items.push({
                name: this.state.rxData[`name${i}`] || cleanOid(this.state.rxData[`oid${i}`]) || `#${i}`,
                value: rounded,
                color: this.state.rxData[`color${i}`] || undefined,
                unit: this.state.units?.[i] || '',
            });
        }

        const sort = this.state.rxData.sort;
        if (sort === 'asc') {
            items.sort((a, b) => a.value - b.value);
        } else if (sort === 'desc') {
            items.sort((a, b) => b.value - a.value);
        }

        return items;
    }

    /** Milliseconds one animation takes, 0 when animations are switched off */
    getAnimationDuration(): number {
        return parseInt(this.state.rxData.animationDuration, 10) || 1000;
    }

    /**
     * Value with its unit, e.g. `12.30 kWh`
     *
     * @param item - the device to format
     * @returns The formatted value
     */
    formatItem(item: ComparisonItem): string {
        return `${formatNumber(item.value, this.state.rxData.decimals ?? 2)}${item.unit ? ` ${item.unit}` : ''}`;
    }

    getBarOption(items: ComparisonItem[]): Record<string, any> {
        const vertical = this.state.rxData.orientation === 'vertical';
        // `reverse()` puts the first configured device at the TOP of a horizontal bar chart, which is what a
        // reader expects. A vertical chart reads left to right, so there it has to stay in configuration order.
        const drawn = vertical ? items : [...items].reverse();
        const axisUnit = items.find(item => item.unit)?.unit || Generic.t('kwh');

        const valueAxis = {
            type: 'value',
            name: axisUnit,
            axisLabel: { formatter: (value: number) => formatNumber(value, 0) },
        };
        const categoryAxis = { type: 'category', data: drawn.map(item => item.name) };

        return {
            tooltip: {
                formatter: (params: { name: string; dataIndex: number }): string =>
                    `${params.name}: ${this.formatItem(drawn[params.dataIndex])}`,
            },
            title: { show: false },
            legend: { show: false },
            backgroundColor: 'transparent',
            animation: !this.state.rxData.noAnimation,
            animationDuration: this.getAnimationDuration(),
            animationDurationUpdate: this.getAnimationDuration(),
            grid: {
                containLabel: true,
                left: 10,
                top: 5,
                right: vertical ? 10 : 50,
                bottom: 10,
            },
            xAxis: vertical ? categoryAxis : valueAxis,
            yAxis: vertical ? valueAxis : categoryAxis,
            series: [
                {
                    type: 'bar',
                    label: {
                        show: !!this.state.rxData.showValues,
                        position: vertical ? 'top' : 'right',
                        formatter: (params: { dataIndex: number }) => this.formatItem(drawn[params.dataIndex]),
                        color: this.props.context.themeType === 'dark' ? '#fff' : '#000',
                    },
                    data: drawn.map(item => ({
                        value: item.value,
                        itemStyle: {
                            color: item.color,
                        },
                    })),
                },
            ],
        };
    }

    getPieOption(items: ComparisonItem[]): Record<string, any> {
        const drawn = [...items].reverse();
        const data = drawn.map(item => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.color },
        }));

        const text = this.state.rxData.innerTitle || '';
        let textValue: string | undefined;
        if (cleanOid(this.state.rxData.inner_oid)) {
            const value = toNumber(this.state.values[`${cleanOid(this.state.rxData.inner_oid)}.val`]) ?? 0;
            textValue = formatNumber(value, this.state.rxData.decimals ?? 2) + (this.state.rxData.innerUnit || '');
        }

        return {
            tooltip: {
                trigger: 'item',
                formatter: (params: { name: string; dataIndex: number }): string =>
                    `${params.name}: ${this.formatItem(drawn[params.dataIndex])}`,
            },
            title: {
                show: true,
                text: [text, textValue].filter(t => t).join('\n'),
                rich: {
                    text: { fontSize: 10 },
                    value: { fontSize: 20 },
                },
                left: 'center',
                top: 'center',
                textStyle: {
                    color: this.props.context.themeType === 'dark' ? '#c7c7c7' : '#3d3d3d',
                },
            },
            backgroundColor: 'transparent',
            animation: !this.state.rxData.noAnimation,
            animationDuration: this.getAnimationDuration(),
            animationDurationUpdate: this.getAnimationDuration(),
            grid: { left: 10, top: 0, right: 10, bottom: 0 },
            xAxis: { show: false },
            yAxis: { show: false },
            legend: {
                show: !!this.state.rxData.legend,
                bottom: 0,
                left: 'center',
                formatter: (name: string): string => {
                    const item = drawn.find(entry => entry.name === name);
                    return item ? `${name}: ${this.formatItem(item)}` : name;
                },
                textStyle: {
                    color: this.props.context.themeType === 'dark' ? '#fff' : '#000',
                },
            },
            series: [
                {
                    type: 'pie',
                    radius: [
                        `${parseFloat(this.state.rxData.innerRadius as string) || 0}%`,
                        this.state.rxData.legend ? `${100 - (this.state.rxData.legendHeight || 0)}%` : '100%',
                    ],
                    data,
                    percentPrecision: this.state.rxData.precision || 0,
                    label: {
                        show: !this.state.rxData.hideLabels,
                        position: 'inside',
                        formatter: '{d}%',
                    },
                },
            ],
        };
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        if (!this.refCardContent.current) {
            setTimeout(() => this.sizeWatcher.observe(this.refCardContent.current), 50);
        }
        const size = this.state.chartHeight;

        const items = this.getItems();
        const option = this.state.rxData.type === 'pie' ? this.getPieOption(items) : this.getBarOption(items);

        const content = (
            <Box
                ref={this.refCardContent}
                sx={styles.cardContent}
            >
                {size ? (
                    <ReactEchartsCore
                        option={option}
                        notMerge
                        theme={this.props.context.themeType === 'dark' ? 'dark' : ''}
                        className="vis-2-widgets-energy-chart"
                        opts={{ renderer: 'svg' }}
                        style={{ height: size }}
                    />
                ) : null}
            </Box>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

export default ConsumptionComparison;
