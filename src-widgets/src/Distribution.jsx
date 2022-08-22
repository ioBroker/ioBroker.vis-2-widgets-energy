import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';

import { I18n } from '@iobroker/adapter-react-v5';
import Generic from './Generic';

const styles = () => ({
    cardContent: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
    },
    circleContent: {
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
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
        this.state.objects = {};
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplEnergy2Distribution',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'vis_2_widgets_energy_distribution',  // Label of widget
            visName: 'Distribution',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'vis_2_widgets_energy_name',
                    },
                    {
                        name: 'defaultColor',
                        type: 'color',
                        label: 'vis_2_widgets_energy_default_color',
                    },
                    {
                        name: 'defaultCircleSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_default_circle_size',
                        tooltip: 'vis_2_widgets_energy_default_circle_size_tooltip',
                        default: 10,
                    },
                    {
                        name: 'defaultDistanceSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_default_distance_size',
                        tooltip: 'vis_2_widgets_energy_default_distance_size_tooltip',
                        default: 18,
                    },
                    {
                        name: 'defaultFontSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_default_font_size',
                        tooltip: 'vis_2_widgets_energy_default_font_size_tooltip',
                        default: 12,
                    },
                    {
                        name: 'nodesCount',
                        type: 'number',
                        label: 'vis_2_widgets_energy_nodes_count',
                    },
                ],
            },
            {
                name: 'home',
                fields: [
                    {
                        name: 'home-oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_home_oid',
                        onChange: async (field, data, changeData, socket) => {
                            const object = await socket.getObject(data[field.name]);
                            if (object && object.common) {
                                data.homeColor  = object.common.color !== undefined ? object.common.color : null;
                                data.homeName  = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.lang()] : object.common.name;
                                changeData(data);
                            }
                        },
                    },
                    {
                        name: 'homeName',
                        label: 'vis_2_widgets_energy_home_name',
                    },
                    {
                        name: 'homeColor',
                        type: 'color',
                        label: 'vis_2_widgets_energy_home_color',
                    },
                    {
                        name: 'homeIcon',
                        type: 'image',
                        label: 'vis_2_widgets_energy_home_icon',
                    },
                    {
                        name: 'homeCircleSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_home_circle_size',
                        tooltip: 'vis_2_widgets_energy_home_circle_size_tooltip',
                    },
                    {
                        name: 'homeDistanceSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_home_distance_size',
                        tooltip: 'vis_2_widgets_energy_home_distance_size_tooltip',
                    },
                    {
                        name: 'homeFontSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_home_font_size',
                        tooltip: 'vis_2_widgets_energy_home_font_size_tooltip',
                    },

                ],
            },
            {
                name: 'powerLine',
                fields: [
                    {
                        name: 'powerLine-oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_power_line_oid',
                        onChange: async (field, data, changeData, socket) => {
                            const object = await socket.getObject(data[field.name]);
                            if (object && object.common) {
                                data.powerLineColor  = object.common.color !== undefined ? object.common.color : null;
                                data.powerLineName  = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.lang()] : object.common.name;
                                changeData(data);
                            }
                        },
                    },
                    {
                        name: 'powerLineReturn-oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_power_line_return_oid',
                        onChange: async (field, data, changeData, socket) => {
                            const object = await socket.getObject(data[field.name]);
                            if (object && object.common) {
                                data.powerLineColor  = object.common.color !== undefined ? object.common.color : null;
                                data.powerLineName  = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.lang()] : object.common.name;
                                changeData(data);
                            }
                        },
                    },
                    {
                        name: 'powerLineName',
                        label: 'vis_2_widgets_energy_power_line_name',
                    },
                    {
                        name: 'powerLineColor',
                        type: 'color',
                        label: 'vis_2_widgets_energy_power_line_color',
                    },
                    {
                        name: 'powerLineIcon',
                        type: 'image',
                        label: 'vis_2_widgets_energy_power_line_icon',
                    },
                    {
                        name: 'powerLineCircleSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_power_line_circle_size',
                        tooltip: 'vis_2_widgets_energy_power_line_circle_size_tooltip',
                    },
                    {
                        name: 'powerLineDistanceSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_power_line_distance_size',
                        tooltip: 'vis_2_widgets_energy_power_line_distance_size_tooltip',
                    },
                    {
                        name: 'powerLineFontSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_power_line_font_size',
                        tooltip: 'vis_2_widgets_energy_power_line_font_size_tooltip',
                    },

                ],
            },
            {
                name: 'node',
                label: 'vis_2_widgets_energy_node',
                indexFrom: 1,
                indexTo: 'nodesCount',
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
                    {
                        name: 'icon',
                        type: 'image',
                        label: 'vis_2_widgets_energy_icon',
                    },
                    {
                        name: 'circleSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_circle_size',
                        tooltip: 'vis_2_widgets_energy_circle_size_tooltip',
                    },
                    {
                        name: 'distanceSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_distance_size',
                        tooltip: 'vis_2_widgets_energy_distance_size_tooltip',
                    },
                    {
                        name: 'fontSize',
                        type: 'number',
                        label: 'vis_2_widgets_energy_font_size',
                        tooltip: 'vis_2_widgets_energy_font_size_tooltip',
                    },

                ],
            }],
            visDefaultStyle: {
                width: '100%',
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_distribution.png',
        };
    }

    async loadObject(oid, iconExists) {
        if (oid) {
            // read object itself
            const object = await this.props.socket.getObject(oid);
            if (!object) {
                return { common: {} };
            }
            object.common = object.common || {};
            if (!iconExists && !object.common.icon && (object.type === 'state' || object.type === 'channel')) {
                const idArray = oid.split('.');

                // read channel
                const parentObject = await this.props.socket.getObject(idArray.slice(0, -1).join('.'));
                if (!parentObject?.common?.icon && (object.type === 'state' || object.type === 'channel')) {
                    const grandParentObject = await this.props.socket.getObject(idArray.slice(0, -2).join('.'));
                    if (grandParentObject?.common?.icon) {
                        object.common.icon = grandParentObject.common.icon;
                    }
                } else {
                    object.common.icon = parentObject.common.icon;
                }
            }
            return { common: object.common, _id: object._id };
        }
        return { common: {} };
    }

    async propertiesUpdate() {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        this.lastRxData = actualRxData;

        const objects = {};

        // try to find icons for all OIDs
        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            objects[`object${i}`] = await this.loadObject(this.state.rxData[`oid${i}`], this.state.rxData[`icon${i}`]);
        }
        objects.home = await this.loadObject(this.state.rxData['home-oid'], this.state.rxData.homeIcon);
        objects.powerLine = await this.loadObject(this.state.rxData['powerLine-oid'], this.state.rxData.powerLineIcon);

        if (JSON.stringify(objects) !== JSON.stringify(this.state.objects)) {
            this.setState({ objects });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.propertiesUpdate();
        this.offsetInterval = setInterval(() => this.setState({ offset: this.state.offset + 1 }), 20);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.offsetInterval);
    }

    onPropertiesUpdated() {
        super.onPropertiesUpdated();
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return Distribution.getWidgetInfo();
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        let size;
        if (!this.refCardContent.current) {
            setTimeout(() => this.forceUpdate(), 50);
        } else {
            size = this.refCardContent.current.offsetWidth;
            if (size > this.refCardContent.current.offsetHeight) {
                size = this.refCardContent.current.offsetHeight;
            }
        }

        const defaultRadiusSize = this.state.rxData.defaultRadiusSize || 10;
        const defaultDistanceSize = this.state.rxData.defaultDistanceSize || 18;
        const defaultFontSize = this.state.rxData.defaultFontSize || 12;

        const homeRadius = size * (this.state.rxData.homeCircleSize || defaultRadiusSize) / 100;
        const homeFontSize = defaultFontSize || this.state.rxData.homeFontSize;
        const homeIcon = this.state.rxData.homeIcon || this.state.objects.home?.common?.icon;

        let maxRadius = 0;
        let valuesSum = 0;
        const circles = [{
            name: this.state.rxData.powerLineName,
            color: this.state.rxData.powerLineColor,
            radius: size * (this.state.rxData.powerLineCircleSize || defaultRadiusSize) / 100,
            distance: size * (this.state.rxData.powerLineDistanceSize || defaultDistanceSize) / 100,
            fontSize: defaultFontSize || this.state.rxData.powerLineFontSize,
            oid: this.state.rxData['powerLine-oid'],
            value: this.state.values[`${this.state.rxData['powerLine-oid']}.val`],
            icon: this.state.rxData.powerLineIcon || this.state.objects.powerLine?.common?.icon,
        }];
        if (circles[0].radius > maxRadius) {
            maxRadius = circles[0].radius;
            valuesSum += Math.abs(circles[0].value) || 0;
        }

        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            circles.push({
                name: this.state.rxData[`name${i}`],
                color: this.state.rxData[`color${i}`],
                radius: size * (this.state.rxData[`circleSize${i}`] || defaultRadiusSize) / 100,
                distance: size * (this.state.rxData[`distanceSize${i}`] || defaultDistanceSize) / 100,
                fontSize: defaultFontSize || this.state.rxData[`fontSize${i}`],
                oid: this.state.rxData[`oid${i}`],
                value: this.state.values[`${this.state.rxData[`oid${i}`]}.val`],
                icon: this.state.rxData[`icon${i}`] || this.state.objects[`object${i}`]?.common?.icon,
            });
            if (circles[i].radius > maxRadius) {
                maxRadius = circles[i].radius;
            }
            valuesSum += Math.abs(this.state.values[`${this.state.rxData[`oid${i}`]}.val`]) || 0;
        }

        let currentPart = 0;

        const content = <div
            ref={this.refCardContent}
            className={this.props.classes.cardContent}
        >
            {size && <div style={{ position: 'relative' }}>
                {circles.map((circle, i) => {
                    const angle = 180 + i * 360 / circles.length;
                    const coordinates = polarToCartesian(0, 0, circle.distance + circle.radius + homeRadius, angle);
                    return <div key={i}>
                        <div
                            className={this.props.classes.circleContent}
                            style={{
                                top: size / 2 + coordinates.y - circle.radius,
                                left: size / 2 + coordinates.x - circle.radius,
                                width: circle.radius * 2,
                                height: circle.radius * 2,
                                fontSize: circle.fontSize,
                            }}
                        >
                            <div>
                                <div>{circle.icon ? <img src={circle.icon} alt="" width={Math.round(circle.fontSize * 1.5)} /> : null}</div>
                                <div>
                                    {circle.value}
                                    {' '}
                                    {I18n.t('vis_2_widgets_energy_kwh')}
                                </div>
                            </div>
                        </div>
                        <div
                            className={this.props.classes.circleContent}
                            style={{
                                top: size / 2 + coordinates.y + circle.radius,
                                left: size / 2 + coordinates.x - circle.radius,
                                width: circle.radius * 2,
                                fontSize: circle.fontSize,
                            }}
                        >
                            <div>
                                <div>{circle.name || circle.oid}</div>
                            </div>
                        </div>
                    </div>;
                })}
                <div>
                    <div
                        className={this.props.classes.circleContent}
                        style={{
                            top: size / 2 - homeRadius,
                            left: size / 2 - homeRadius,
                            width: homeRadius * 2,
                            height: homeRadius * 2,
                            fontSize: homeFontSize,
                        }}
                    >
                        <div>
                            <div>{homeIcon ? <img src={homeIcon} alt="" width={Math.round(homeFontSize * 1.5)} /> : null}</div>
                            <div>
                                {this.state.values[`${this.state.rxData['home-oid']}.val`]}
                                {' '}
                                {I18n.t('vis_2_widgets_energy_kwh')}
                            </div>
                        </div>
                    </div>
                    <div
                        className={this.props.classes.circleContent}
                        style={{
                            top: size / 2 + homeRadius,
                            left: size / 2 - homeRadius,
                            width: homeRadius * 2,
                            fontSize: homeFontSize,
                        }}
                    >
                        <div>
                            <div>{this.state.rxData.homeName || this.state.rxData['home-oid']}</div>
                        </div>
                    </div>
                </div>
                <svg style={{ width: size, height: size }}>
                    <circle
                        cx="50%"
                        cy="50%"
                        r={homeRadius}
                        fill="none"
                        stroke={this.state.rxData.homeColor || this.props.theme.palette.text.primary}
                        strokeWidth="3"
                    />
                    {circles.map((circle, i) => {
                        const partRadiusStroke = ((valuesSum - (Math.abs(circle.value) || 0)) / valuesSum) * (Math.PI * (homeRadius * 2));
                        const result = <circle
                            key={i}
                            cx="50%"
                            cy="50%"
                            r={homeRadius}
                            fill="none"
                            stroke={circle.color || this.state.rxData.homeColor || this.props.theme.palette.text.primary}
                            style={{
                                strokeDashoffset: partRadiusStroke,
                                strokeDasharray: Math.PI * (homeRadius * 2),
                                transition: 'stroke-dashoffset 0.5s linear',
                            }}
                            transform={`rotate(${Math.round(currentPart / valuesSum * 360 + 135)},${size / 2},${size / 2})`}
                            strokeWidth="3"
                        />;
                        currentPart += Math.abs(circle.value);
                        return result;
                    })}
                    {circles.map((circle, i) => {
                        const angle = 180 + i * 360 / circles.length;
                        const coordinates = polarToCartesian(0, 0, circle.distance + circle.radius + homeRadius, angle);
                        const coordinatesFrom = polarToCartesian(0, 0, homeRadius, angle);
                        const coordinatesTo = polarToCartesian(0, 0, homeRadius + circle.distance, angle);
                        const offset = circle.value < 0 ?
                            (this.state.offset + i * 10) % circle.distance :
                            circle.distance - (this.state.offset + i * 10) % circle.distance;
                        const coordinatesOffset = polarToCartesian(0, 0, homeRadius + offset, angle);
                        const color = circle.color || this.state.rxData.defaultColor || this.props.theme.palette.text.primary;
                        return <React.Fragment key={i}>
                            <circle
                                cx="50%"
                                cy="50%"
                                r={circle.radius}
                                fill="none"
                                stroke={color}
                                strokeWidth="3"
                                transform={
                                    `translate(${coordinates.x}, ${coordinates.y})`
                                }
                            />
                            <line
                                x1={size / 2 + coordinatesFrom.x}
                                y1={size / 2 + coordinatesFrom.y}
                                x2={size / 2 + coordinatesTo.x}
                                y2={size / 2 + coordinatesTo.y}
                                stroke={color}
                            />
                            <circle
                                cx="50%"
                                cy="50%"
                                r="2"
                                fill="none"
                                stroke={color}
                                strokeWidth="3"
                                transform={
                                    `translate(${coordinatesOffset.x}, ${coordinatesOffset.y})`
                                }
                            />
                        </React.Fragment>;
                    })}
                </svg>
            </div>}
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
