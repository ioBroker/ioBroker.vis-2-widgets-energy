import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';

import ReactEchartsCore from 'echarts-for-react';
import moment from 'moment';
import Generic from './Generic';

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
                        type: 'id',
                        label: 'vis_2_widgets_energy_oid',
                        onChange: async (field, data, changeData, socket) => {
                            const object = await socket.getObject(data[field.name]);
                            if (object && object.common) {
                                data[`color${field.index}`]  = object.common.color !== undefined ? object.common.color : null;
                                data[`name${field.index}`]  = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.lang()] : object.common.name;
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
                ],
            }],
            visDefaultStyle: {
                width: '100%',
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_color_gauge.png',
        };
    }

    async propertiesUpdate() {
        const timeInterval = this.state.rxData.timeInterval || 12;
        const now = new Date();
        now.setHours(now.getHours() - timeInterval);
        now.setMinutes(0);
        now.setSeconds(0);
        now.setMilliseconds(0);
        const start = now.getTime();
        const end = Date.now();

        for (let i = 1; i <= this.state.rxData.devicesCount; i++) {
            if (this.state.rxData[`oid${i}`] && this.state.rxData[`oid${i}`] !== 'nothing_selected') {
                const options = {
                    instance: this.props.systemConfig?.common?.defaultHistory || 'history.0',
                    start,
                    end,
                    step: 1800000, // 30 minutes
                    from: false,
                    ack: false,
                    q: false,
                    addID: false,
                    aggregate: 'minmax',
                };

                const history = await this.props.socket.getHistory(this.state.rxData[`oid${i}`], options);
                console.log(history);
                this.setState({ [`history${i}`]: history });
            }
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    onPropertiesUpdated() {
        super.onPropertiesUpdated();
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

        console.log(data);

        return {
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
            grid: { containLabel: true },
            yAxis: { name: 'amount' },
            xAxis: { type: 'category', data: data?.[0]?.values?.map(dateValue => moment(dateValue.ts).format('DD.MM.YYYY hh:mm:ss')) },
            series: data.map(item => (
                {
                    type: 'bar',
                    name: item.name,
                    itemStyle: {
                        color: item.color,
                    },
                    data: item.values?.map(dateValue => dateValue.val),
                    encode: {
                        // Map the "amount" column to X axis.
                        y: 'amount',
                        // Map the "product" column to Y axis
                        x: 'product',
                    },
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
        return this.wrapContent(content, null, { textAlign: 'center' });
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
