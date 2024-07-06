import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';

import ReactEchartsCore from 'echarts-for-react';
import Generic from './Generic';

const styles = {
    cardContent: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
        '& .vis-2-widgets-energy-chart': {
            width: '100%',
            '&>div': {
                borderRadius: 5,
            },
        },
    },
};

class ConsumptionComparison extends Generic {
    constructor(props) {
        super(props);
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplEnergy2ConsumptionComparison',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'consumption_comparison',  // Label of widget
            visName: 'Consumption comparison',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                        },
                        {
                            name: 'type',
                            label: 'type',
                            type: 'select',
                            options: [
                                { value: 'bar', label: 'bar' },
                                { value: 'pie', label: 'pie' },
                            ],
                            default: 'bar',
                        },
                        {
                            name: 'innerRadius',
                            label: 'inner_radius',
                            type: 'slider',
                            min: 0,
                            max: 80,
                            hidden: 'data.type !== "pie"',
                        },
                        {
                            name: 'innerTitle',
                            label: 'inner_title',
                            type: 'text',
                            hidden: 'data.type !== "pie"',
                        },
                        {
                            name: 'innerRadius',
                            label: 'inner_radius',
                            type: 'slider',
                            min: 0,
                            max: 80,
                            hidden: 'data.type !== "pie"',
                        },
                        {
                            name: 'inner_oid',
                            label: 'inner_oid',
                            type: 'id',
                            hidden: 'data.type !== "pie"',
                            onChange: async (field, data, changeData, socket) => {
                                const object = data[field.name] ? (await socket.getObject(data[field.name])) : null;
                                if (object?.common?.unit) {
                                    data.innerUnit = object.common.unit;
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'innerUnit',
                            label: 'inner_unit',
                            type: 'text',
                            hidden: 'data.type !== "pie" || !data.inner_oid',
                        },
                        {
                            name: 'legend',
                            label: 'legend',
                            type: 'checkbox',
                            hidden: 'data.type !== "pie"',
                        },
                        {
                            name: 'legendHeight',
                            label: 'legend_height',
                            type: 'slider',
                            min: 5,
                            max: 30,
                            default: 10,
                            hidden: 'data.type !== "pie" || !data.legend',
                        },
                        {
                            name: 'hideLabels',
                            label: 'hide_Labels',
                            type: 'checkbox',
                            hidden: 'data.type !== "pie"',
                        },
                        {
                            name: 'precision',
                            label: 'precision',
                            type: 'slider',
                            min: 0,
                            max: 5,
                            default: 0,
                            hidden: 'data.type !== "pie" || !!data.hideLabels',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'devicesCount',
                            type: 'number',
                            label: 'devices_count',
                            min: 2,
                            default: 2,
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
                            onChange: async (field, data, changeData, socket) => {
                                const object = data[field.name] ? (await socket.getObject(data[field.name])) : null;
                                if (object?.common) {
                                    data[`color${field.index}`] = object.common.color !== undefined ? object.common.color : null;
                                    data[`name${field.index}`] = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'name',
                            label: 'name',
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                        },
                        {
                            name: 'unit',
                            label: 'unit',
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
                            default: 1,
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

    async propertiesUpdate() {
        const units = [];
        const ids = [];
        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            if (!this.state.rxData[`unit${i}`] && this.state.rxData[`oid${i}`] && this.state.rxData[`oid${i}`] !== 'nothing_selected') {
                ids.push(this.state.rxData[`oid${i}`]);
            }
        }
        const _objects = ids.length ? (await this.props.context.socket.getObjectsById(ids)) : {};

        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            if (!this.state.rxData[`unit${i}`]) {
                const object = _objects[this.state.rxData[`oid${i}`]];
                if (object?.common?.unit) {
                    units[i] = object.common.unit;
                    if (units[i] === 'kW') {
                        units[i] = 'kWh';
                    } else if (units[i] === 'W') {
                        units[i] = 'Wh';
                    }
                }
            } else {
                units[i] = this.state.rxData[`unit${i}`];
            }
        }

        if (JSON.stringify(units) !== JSON.stringify(this.state.units)) {
            this.setState({ units });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    onRxDataChanged() {
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return ConsumptionComparison.getWidgetInfo();
    }

    /**
     *
     * @returns {echarts.EChartsOption}
     */
    getBarOption() {
        const data = [];
        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            let value = this.state.values[`${this.state.rxData[`oid${i}`]}.val`] || 0;
            if (this.state.rxData[`factor${i}`] && this.state.rxData[`factor${i}`] !== 1) {
                value *= this.state.rxData[`factor${i}`];
            } else if (this.state.units && this.state.units[i] === 'Wh') {
                value /= 1000;
            }
            value = Math.round(value * 100) / 100;

            data.push({
                name: this.state.rxData[`name${i}`] || '',
                value,
                color: this.state.rxData[`color${i}`] || undefined,
            });
        }

        data.reverse();

        return {
            tooltip: {
                // formatter: '{b}: {c} kWh',
                formatter: (params /* , ticket, callback */) => `${params.name}: ${params.data.value}${this.state.units && this.state.units[params.dataIndex + 1] ? ` ${this.state.units[params.dataIndex + 1]}` : ''}`,
            },
            title:{
                show: false,
            },
            legend:{
                show: false,
            },
            backgroundColor: 'transparent',
            grid: {
                containLabel: true,
                left: 10,
                top: 5,
                right: 50,
                bottom: 10,
            },
            xAxis: { name: this.state.unit ? Generic.t(this.state.unit) : Generic.t('kwh') },
            yAxis: { type: 'category', data: data.map(item => item.name) },
            series: [
                {
                    type: 'bar',
                    data: data.map(item => ({
                        value: item.value,
                        itemStyle: {
                            color: item.color,
                        },
                    })),
                },
            ],
        };
    }

    /**
     *
     * @returns {echarts.EChartsOption}
     */
    getPieOption() {
        const data = [];
        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            let value = this.state.values[`${this.state.rxData[`oid${i}`]}.val`] || 0;
            this.state.rxData[`factor${i}`] = parseFloat(this.state.rxData[`factor${i}`]) || 1;
            if (this.state.rxData[`factor${i}`] && this.state.rxData[`factor${i}`] !== 1) {
                value *= this.state.rxData[`factor${i}`];
            } else if (this.state.units && this.state.units[i] === 'Wh') {
                value /= 1000;
            }
            value = Math.round(value * 100) / 100;

            data.push({
                name: this.state.rxData[`name${i}`] || '',
                value,
                itemStyle: {
                    color: this.state.rxData[`color${i}`] || undefined,
                },
            });
        }
        let text = '';
        if (this.state.rxData.innerTitle) {
            text = this.state.rxData.innerTitle;
        }
        let textValue;
        if (this.state.rxData.inner_oid) {
            let valueC = this.state.values[`${this.state.rxData.inner_oid}.val`] || 0;
            valueC = Math.round(valueC * 100) / 100;
            textValue = valueC + (this.state.rxData.innerUnit || '');
        }

        data.reverse();

        const title = {
            show: true,
            text: [
                text,
                textValue,
            ].filter(t => t).join('\n'),
            rich: {
                text: {
                    fontSize: 10,
                },
                value: {
                    fontSize: 20,
                },
            },
            left: 'center',
            top: 'center',
            textStyle: {
                color: this.props.context.themeType === 'dark' ? '#c7c7c7' : '#3d3d3d',
            },
        };

        return {
            tooltip: {
                trigger: 'item',
                formatter: params => `${params.name}: ${params.data.value}${this.state.units && this.state.units[params.dataIndex + 1] ? ` ${this.state.units[params.dataIndex + 1]}` : ''}`,
            },
            title,
            backgroundColor: 'transparent',
            grid: {
                left: 10,
                top: 0,
                right: 10,
                bottom: 0,
            },
            xAxis: {
                show: false,
            },
            yAxis: {
                show: false,
            },
            legend: {
                show: this.state.rxData.legend,
                bottom: 0,
                left: 'center',
                formatter: name => {
                    const i = data.findIndex(item => item.name === name);
                    return `${name}: ${data[i].value}${this.state.units && this.state.units[i + 1] ? ` ${this.state.units[i + 1]}` : ''}`;
                },
                textStyle: {
                    color: this.props.context.themeType === 'dark' ? '#fff' : '#000',
                },
            },
            series: [
                {
                    type: 'pie',
                    radius: [`${parseFloat(this.state.rxData.innerRadius) || 0}%`, this.state.rxData.legend ? `${100 - (this.state.rxData.legendHeight || 0)}%` : '100%'],
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

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        let size;
        if (!this.refCardContent.current) {
            setTimeout(() => this.forceUpdate(), 50);
        } else {
            size = this.refCardContent.current.offsetHeight;
        }

        const option = this.state.rxData.type === 'pie' ? this.getPieOption() : this.getBarOption();

        const content = <Box
            ref={this.refCardContent}
            sx={styles.cardContent}
        >
            {size && <ReactEchartsCore
                option={option}
                theme={this.props.themeType === 'dark' ? 'dark' : ''}
                className="vis-2-widgets-energy-chart"
                opts={{ renderer: 'svg' }}
                style={{ height: size }}
            />}
        </Box>;

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

ConsumptionComparison.propTypes = {
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default ConsumptionComparison;
