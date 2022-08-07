import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';

import Generic from './Generic';

const styles = () => ({

});

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const returnValue = {};
    const angleInRadians =  angleInDegrees * Math.PI / 180.0;
    returnValue.x =    Math.round(centerX + radius * Math.cos(angleInRadians));
    returnValue.y =    Math.round(centerY + radius * Math.sin(angleInRadians));
    return returnValue;
}

class Distribution extends Generic {
    constructor(props) {
        super(props);
        this.state.offset = 0;
        this.state.radius = 40;
        this.state.betweenCircles = 100;
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplGauge2ConsumptionComparation',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'vis_2_widgets_energy_consumption_comparation',  // Label of widget
            visName: 'Color gauge',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'vis_2_widgets_gauges_name',
                    },
                    {
                        name: 'oid',
                        type: 'id',
                        label: 'vis_2_widgets_gauges_oid',
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
                        label: 'vis_2_widgets_gauges_min',
                    },
                    {
                        name: 'max',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_max',
                    },
                    {
                        name: 'unit',
                        label: 'vis_2_widgets_gauges_unit',
                    },
                    {
                        name: 'levelsCount',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_levels_count',
                    },
                ],
            },
            {
                name: 'visual',
                label: 'vis_2_widgets_gauges_visual',
                fields: [
                    {
                        name: 'needleColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_needle_color',
                    },
                    {
                        name: 'needleBaseColor',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_needle_base_color',
                    },
                    {
                        name: 'marginInPercent',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_margin_in_percent',
                        tooltip: 'vis_2_widgets_gauges_margin_in_percent_tooltip',
                    },
                    {
                        name: 'cornerRadius',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_corner_radius',
                    },
                    {
                        name: 'arcPadding',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_arc_padding',
                        tooltip: 'vis_2_widgets_gauges_arc_padding_title',
                    },
                    {
                        name: 'arcWidth',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_arc_width',
                        tooltip: 'vis_2_widgets_gauges_arc_tooltip',
                    },
                ],
            },
            {
                name: 'anumation',
                label: 'vis_2_widgets_gauges_animation',
                fields: [
                    {
                        name: 'animate',
                        type: 'checkbox',
                        default: true,
                        label: 'vis_2_widgets_gauges_animate',
                    },
                    {
                        name: 'animDelay',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_anim_delay',
                        tooltip: 'vis_2_widgets_gauges_anim_delay_tooltip',
                    },
                    {
                        name: 'animateDuration',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_animate_duration',
                        tooltip: 'vis_2_widgets_gauges_animate_duration_tooltip',
                    },
                ],
            },
            {
                name: 'level',
                label: 'vis_2_widgets_gauges_level',
                indexFrom: 1,
                indexTo: 'levelsCount',
                fields: [
                    {
                        name: 'color',
                        type: 'color',
                        label: 'vis_2_widgets_gauges_color',
                    },
                    {
                        name: 'levelThreshold',
                        type: 'number',
                        label: 'vis_2_widgets_gauges_level_threshold',
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
        this.offsetInterval = setInterval(() => this.setState({ offset: this.state.offset + 1 }), 20);
    }

    onPropertiesUpdated() {
        super.onPropertiesUpdated();
        this.propertiesUpdate();
        clearInterval(this.offsetInterval);
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return Distribution.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        const circles = [0, 1, 2, 3, 4, 5];

        const size = this.state.betweenCircles * 2 + this.state.radius * 6 + 20;

        console.log(this.props);
        const content = <div style={{ position: 'relative', zoom: this.props.style.width / size }}>
            {circles.map(i => {
                const coordinates = polarToCartesian(0, 0, this.state.betweenCircles + this.state.radius * 2, i * (360 / circles.length));
                return <div style={{
                    position: 'absolute',
                    top: size / 2 + coordinates.y - this.state.radius,
                    left: size / 2 + coordinates.x - this.state.radius,
                    width: this.state.radius * 2,
                    height: this.state.radius * 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
                >
                    <span>
                        {i}
                        <br />
                        {i}
                    </span>
                </div>;
            })}
            <div style={{
                position: 'absolute',
                top: size / 2 - this.state.radius,
                left: size / 2 - this.state.radius,
                width: this.state.radius * 2,
                height: this.state.radius * 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
            }}
            >
                <span>
                    center
                    <br />
                    center
                </span>
            </div>
            <svg style={{ width: size, height: size }}>
                <circle cx="50%" cy="50%" r="40" fill="none" stroke="black" strokeWidth="3" />
                {circles.map(i => {
                    const coordinates = polarToCartesian(0, 0, this.state.betweenCircles + this.state.radius * 2, i * (360 / circles.length));
                    const coordinatesFrom = polarToCartesian(0, 0, this.state.radius, i * (360 / circles.length));
                    const coordinatesTo = polarToCartesian(0, 0, this.state.radius + this.state.betweenCircles, i * (360 / circles.length));
                    const coordinatesOffset = polarToCartesian(0, 0, this.state.radius + (this.state.offset + i * 10) % this.state.betweenCircles, i * (360 / circles.length));
                    return <>
                        <circle
                            cx="50%"
                            cy="50%"
                            key={i}
                            r="40"
                            fill="none"
                            stroke="black"
                            strokeWidth="3"
                            transform={
                                `translate(${coordinates.x}, ${coordinates.y})`
                            }
                        />
                        <line x1={size / 2 + coordinatesFrom.x} y1={size / 2 + coordinatesFrom.y} x2={size / 2 + coordinatesTo.x} y2={size / 2 + coordinatesTo.y} stroke="black" />
                        <circle
                            cx="50%"
                            cy="50%"
                            r="2"
                            fill="none"
                            stroke="black"
                            strokeWidth="3"
                            transform={
                                `translate(${coordinatesOffset.x}, ${coordinatesOffset.y})`
                            }
                        />
                    </>;
                })}
            </svg>
        </div>;
        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

Distribution.propTypes = {
    systemConfig: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default withStyles(styles)(withTheme(Distribution));
