import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';

import ReactEchartsCore from 'echarts-for-react';
import moment from 'moment';

import { I18n } from '@iobroker/adapter-react-v5';

import Generic from './Generic';
import { getFromToTime } from './Utils';

const styles = () => ({

});

class Consumption extends Generic {
    constructor(props) {
        super(props);
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplEnergy2Consumption',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'vis_2_widgets_energy_consumption',  // Label of widget
            visName: 'Consumption',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'vis_2_widgets_energy_name',
                    },
                    {
                        name: 'devicesCount',
                        type: 'number',
                        label: 'vis_2_widgets_energy_devices_count',
                        default: 1,
                    },
                    {
                        name: 'start-oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_start_oid',
                        tooltip: 'vis_2_widgets_energy_start_oid_tooltip',
                    },
                    {
                        name: 'interval-oid',
                        type: 'id',
                        hidden: data => !data['start-oid'],
                        label: 'vis_2_widgets_energy_interval_oid',
                        tooltip: 'vis_2_widgets_energy_start_oid_tooltip',
                    },
                ],
            },
            {
                name: 'aggregation',
                label: 'vis_2_widgets_energy_aggregation',
                fields: [
                    {
                        name: 'aggregate',
                        label: 'vis_2_widgets_energy_aggregate',
                        type: 'select',
                        options: ['minmax', 'max', 'min', 'average', 'total', 'count', 'percentile', 'quantile', 'integral', 'none'],
                        default: 'total',
                    },
                    {
                        name: 'percentile',
                        default: 50,
                        type: 'number',
                        label: 'vis_2_widgets_energy_percentile',
                        hidden: data => data.aggregate !== 'percentile',
                    },
                    {
                        name: 'quantile',
                        default: 0.5,
                        type: 'number',
                        label: 'vis_2_widgets_energy_quantile',
                        hidden: data => data.aggregate !== 'quantile',
                    },
                    {
                        name: 'integralUnit',
                        default: 60,
                        type: 'number',
                        label: 'vis_2_widgets_energy_integral_unit',
                        hidden: data => data.aggregate !== 'integral',
                    },
                    {
                        name: 'integralInterpolation',
                        default: 'none',
                        type: 'select',
                        options: ['linear', 'none'],
                        label: 'vis_2_widgets_energy_integral_interpolation',
                        hidden: data => data.aggregate !== 'integral',
                    },
                ],
            },
            {
                name: 'devices',
                label: 'vis_2_widgets_energy_level',
                indexFrom: 1,
                indexTo: 'devicesCount',
                fields: [
                    {
                        name: 'oid',
                        type: 'hid',
                        label: 'vis_2_widgets_energy_oid',
                        onChange: async (field, data, changeData, socket) => {
                            const object = await socket.getObject(data[field.name]);
                            if (object && object.common) {
                                data[`color${field.index}`]  = object.common.color !== undefined ? object.common.color : null;
                                data[`name${field.index}`]  = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.getLanguage()] : object.common.name;
                                changeData(data);
                            }
                        },
                    },
                    {
                        name: 'name',
                        label: 'vis_2_widgets_energy_name',
                    },
                    {
                        name: 'color',
                        type: 'color',
                        label: 'vis_2_widgets_energy_color',
                    },
                    {
                        name: 'unit',
                        label: 'vis_2_widgets_energy_unit',
                    },
                ],
            }],
            visDefaultStyle: {
                width: 320,
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_consumption.png',
        };
    }

    async propertiesUpdate() {
        const interval = getFromToTime(this.props.timeStart, this.props.timeInterval);

        const types = {
            year: {
                count: 12,
            },
            month: {
                count: new Date(interval.from.getFullYear(), interval.from.getMonth, 0).getDate(),
            },
            week: {
                count: 7,
            },
            day: {
                count: 24,
            },
        };

        const options = {
            instance: this.props.systemConfig?.common?.defaultHistory || 'history.0',
            start: interval.from.getTime(),
            end: interval.to.getTime(),
            count: types[this.props.timeInterval].count,
            from: false,
            ack: false,
            q: false,
            addID: false,
            aggregate: this.state.rxData.aggregate || 'total',
            percentile: this.state.rxData.percentile,
            quantile: this.state.rxData.quantile,
            integralUnit: this.state.rxData.integralUnit,
            integralInterpolation: this.state.rxData.integralInterpolation,
        };

        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            if (this.state.rxData[`oid${i}`] && this.state.rxData[`oid${i}`] !== 'nothing_selected') {
                const history = (await this.props.socket.getHistory(this.state.rxData[`oid${i}`], options))
                    .sort((a, b) => (a.ts > b.ts ? 1 : -1));
                this.setState({ [`history${i}`]: history });
            }
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (super.componentDidUpdate) {
            super.componentDidUpdate(prevProps, prevState, snapshot);
        }
        if (this.props.timeInterval !== prevProps.timeInterval) {
            this.propertiesUpdate();
        }
    }

    onStateUpdated() {
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return Consumption.getWidgetInfo();
    }

    /**
     *
     * @returns {echarts.EChartsOption}
     */
    getOption() {
        const data = [];
        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            data.push({
                name: this.state.rxData[`name${i}`],
                value: this.state.values[`${this.state.rxData[`oid${i}`]}.val`],
                values: this.state[`history${i}`],
                color: this.state.rxData[`color${i}`],
            });
        }

        const timeTypes = {
            year: 'MMM',
            month: 'DD.MM',
            week: 'ddd',
            day: 'HH:00',
        };

        return {
            backgroundColor: 'transparent',
            tooltip: {},
            legend: { data: data.map(item => item.name) },
            toolbox: {
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
                top: 40,
                right: 10,
                bottom: 10,
            },
            yAxis: { },
            xAxis: {
                type: 'category',
                data: data?.[0]?.values?.map(dateValue => moment(dateValue.ts).format(
                    timeTypes[this.props.timeInterval],
                )),
            },
            series: data.map(item => (
                {
                    type: 'bar',
                    name: item.name,
                    itemStyle: {
                        color: item.color,
                    },
                    data: item.values?.map(dateValue => dateValue.val),
                    stack: 'one',
                }
            )),
        };
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const content = <ReactEchartsCore
            option={this.getOption()}
            theme={this.props.themeType === 'dark' ? 'dark' : ''}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
        />;
        return this.wrapContent(content, null, { textAlign: 'center', height: 'calc(100% - 32px)' });
    }
}

Consumption.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withStyles(styles)(withTheme(Consumption));
