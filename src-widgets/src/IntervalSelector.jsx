import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import moment from 'moment';

import { I18n } from '@iobroker/adapter-react-v5';
import { Button, ButtonGroup } from '@mui/material';
import Generic from './Generic';

const styles = () => ({
    nowButton: {
        marginRight: 20,
    },
});

class IntervalSelector extends Generic {
    constructor(props) {
        super(props);
        this.state.period = 'now';
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplEnergy2IntervalSelector',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'vis_2_widgets_energy_interval_selector',  // Label of widget
            visName: 'Interval selector',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'vis_2_widgets_energy_name',
                    },
                    {
                        name: 'oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_oid',
                        onChange: async (field, data, changeData, socket) => {
                            const object = await socket.getObject(data.oid);
                            if (object && object.common) {
                                data.min = object.common.min !== undefined ? object.common.min : 0;
                                data.max = object.common.max !== undefined ? object.common.max : 100;
                                data.unit = object.common.unit !== undefined ? object.common.unit : '';
                                changeData(data);
                            }
                        },
                    },
                    {
                        name: 'min',
                        type: 'number',
                        label: 'vis_2_widgets_energy_min',
                    },
                    {
                        name: 'max',
                        type: 'number',
                        label: 'vis_2_widgets_energy_max',
                    },
                    {
                        name: 'unit',
                        label: 'vis_2_widgets_energy_unit',
                    },
                    {
                        name: 'levelsCount',
                        type: 'number',
                        label: 'vis_2_widgets_energy_levels_count',
                    },
                ],
            },
            {
                name: 'visual',
                label: 'vis_2_widgets_energy_visual',
                fields: [
                    {
                        name: 'needleColor',
                        type: 'color',
                        label: 'vis_2_widgets_energy_needle_color',
                    },
                    {
                        name: 'needleBaseColor',
                        type: 'color',
                        label: 'vis_2_widgets_energy_needle_base_color',
                    },
                    {
                        name: 'marginInPercent',
                        type: 'number',
                        label: 'vis_2_widgets_energy_margin_in_percent',
                        tooltip: 'vis_2_widgets_energy_margin_in_percent_tooltip',
                    },
                    {
                        name: 'cornerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_energy_corner_radius',
                    },
                    {
                        name: 'arcPadding',
                        type: 'number',
                        label: 'vis_2_widgets_energy_arc_padding',
                        tooltip: 'vis_2_widgets_energy_arc_padding_title',
                    },
                    {
                        name: 'arcWidth',
                        type: 'number',
                        label: 'vis_2_widgets_energy_arc_width',
                        tooltip: 'vis_2_widgets_energy_arc_tooltip',
                    },
                ],
            },
            {
                name: 'anumation',
                label: 'vis_2_widgets_energy_animation',
                fields: [
                    {
                        name: 'animate',
                        type: 'checkbox',
                        default: true,
                        label: 'vis_2_widgets_energy_animate',
                    },
                    {
                        name: 'animDelay',
                        type: 'number',
                        label: 'vis_2_widgets_energy_anim_delay',
                        tooltip: 'vis_2_widgets_energy_anim_delay_tooltip',
                    },
                    {
                        name: 'animateDuration',
                        type: 'number',
                        label: 'vis_2_widgets_energy_animate_duration',
                        tooltip: 'vis_2_widgets_energy_animate_duration_tooltip',
                    },
                ],
            },
            {
                name: 'level',
                label: 'vis_2_widgets_energy_level',
                indexFrom: 1,
                indexTo: 'levelsCount',
                fields: [
                    {
                        name: 'color',
                        type: 'color',
                        label: 'vis_2_widgets_energy_color',
                    },
                    {
                        name: 'levelThreshold',
                        type: 'number',
                        label: 'vis_2_widgets_energy_level_threshold',
                        hidden: (data, index) => index === data.levelsCount,
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
        if (this.state.rxData.oid && this.state.rxData.oid !== 'nothing_selected') {
            const obj = await this.props.socket.getObject(this.state.rxData.oid);
            this.setState({ object: obj });
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
        return IntervalSelector.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        let periodName = '';

        if (this.state.period === 'now') {
            periodName = moment().format('DD.MM.YYYY, hh:mm:ss');
        } else if (this.state.period === 'day') {
            periodName = moment().format('DD.MM.YYYY');
        } else if (this.state.period === 'week') {
            periodName = `${moment(new Date() - 7 * 24 * 60 * 60 * 1000).format('DD.MM.YYYY')} - ${moment().format('DD.MM.YYYY')}`;
        } else if (this.state.period === 'month') {
            periodName = `${moment(new Date() - 30 * 24 * 60 * 60 * 1000).format('DD.MM.YYYY')} - ${moment().format('DD.MM.YYYY')}`;
        } else if (this.state.period === 'year') {
            periodName = `${moment(new Date() - 365 * 24 * 60 * 60 * 1000).format('DD.MM.YYYY')} - ${moment().format('DD.MM.YYYY')}`;
        }
        const content = <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%',
        }}
        >
            {periodName}
            <Button
                variant="contained"
                color={this.state.period === 'now' ? 'primary' : 'grey'}
                onClick={() => this.setState({ period: 'now' })}
                className={this.props.classes.nowButton}
            >
                {I18n.t('vis_2_widgets_energy_now')}
            </Button>
            <ButtonGroup>
                {['day', 'week', 'month', 'year'].map(period =>
                    <Button
                        key={period}
                        variant="contained"
                        color={period === this.state.period ? 'primary' : 'grey'}
                        onClick={() => this.setState({ period })}
                    >
                        {I18n.t(`vis_2_widgets_energy_${period}`)}
                    </Button>)}
            </ButtonGroup>
        </div>;
        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

IntervalSelector.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withStyles(styles)(withTheme(IntervalSelector));
