import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';

import { I18n } from '@iobroker/adapter-react-v5';
import { Home as HomeIcon } from '@mui/icons-material';

import Generic from './Generic';
import PowerLine from './icons/PowerLine';
import SolarIcon from './icons/Solar';
import LeafIcon from './icons/Leaf';

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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const returnValue = {};
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    returnValue.x = Math.round((centerX + radius * Math.cos(angleInRadians)) * 100) / 100;
    returnValue.y = Math.round((centerY + radius * Math.sin(angleInRadians)) * 100) / 100;
    return returnValue;
}

const STANDARD_ICONS = [
    { value: '', label: 'vis_2_widgets_energy_icons_none' },
    {
        value: 'home',
        label: 'vis_2_widgets_energy_icons_home',
        icon: <HomeIcon width={24} />,
        component: HomeIcon,
    },
    {
        value: 'powerLIne',
        label: 'vis_2_widgets_energy_icons_powerline',
        icon: <PowerLine width={24} />,
        component: PowerLine,
    },
    {
        value: 'solar',
        label: 'vis_2_widgets_energy_icons_solar',
        icon: <SolarIcon width={24} />,
        component: SolarIcon,
    },
    {
        value: 'leaf',
        label: 'vis_2_widgets_energy_icons_leaf',
        icon: <LeafIcon width={24} />,
        component: LeafIcon,
    },
];

class Distribution extends Generic {
    constructor(props) {
        super(props);
        this.state.offset = 0;
        this.state.objects = {};
        this.state.units = {};
        this.refCardContent = React.createRef();
    }

    static getWidgetInfo() {
        return {
            id: 'tplEnergy2Distribution',
            visSet: 'vis-2-widgets-energy',
            visSetLabel: 'vis_2_widgets_energy_set_label', // Label of widget set
            visWidgetLabel: 'vis_2_widgets_energy_distribution',  // Label of widget
            visName: 'Distribution',
            visAttrs: [
                {
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
                            min: 0,
                            max: 10,
                            label: 'vis_2_widgets_energy_nodes_count',
                        },
                    ],
                },
                {
                    name: 'home',
                    label: 'vis_2_widgets_energy_group_home',
                    fields: [
                        {
                            name: 'home-oid',
                            type: 'id',
                            label: 'vis_2_widgets_energy_home_oid',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name]);
                                if (object && object.common) {
                                    data.homeColor  = object.common.color !== undefined ? object.common.color : null;
                                    data.homeName  = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.getLanguage()] : object.common.name;
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
                            name: 'homeStandardIcon',
                            type: 'select',
                            label: 'vis_2_widgets_energy_standard_icon',
                            options: STANDARD_ICONS.map(item => ({
                                value: item.value,
                                label: item.label,
                                icon: item.icon,
                                color: item.color,
                            })),
                            default: '',
                        },
                        {
                            name: 'homeIcon',
                            type: 'image',
                            hidden: data => !!data.homeStandardIcon,
                            label: 'vis_2_widgets_energy_custom_icon',
                        },
                        {
                            name: 'homeCircleSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'vis_2_widgets_energy_home_circle_size',
                            tooltip: 'vis_2_widgets_energy_home_circle_size_tooltip',
                        },
                        {
                            name: 'homeDistanceSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
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
                    label: 'vis_2_widgets_energy_group_powerLine',
                    fields: [
                        {
                            name: 'powerLine-oid',
                            type: 'id',
                            label: 'vis_2_widgets_energy_power_line_oid',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name]);
                                if (object && object.common) {
                                    data.powerLineColor = object.common.color !== undefined ? object.common.color : null;
                                    data.powerLineName = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.getLanguage()] : object.common.name;
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
                                    data.powerLineColor = object.common.color !== undefined ? object.common.color : null;
                                    data.powerLineName = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.getLanguage()] : object.common.name;
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
                            name: 'powerLineReturnColor',
                            hidden: data => !data['powerLineReturn-oid'],
                            type: 'color',
                            label: 'vis_2_widgets_energy_power_line_return_color',
                            default: '#208020',
                        },
                        {
                            name: 'powerLineStandardIcon',
                            type: 'select',
                            label: 'vis_2_widgets_energy_standard_icon',
                            options: STANDARD_ICONS.map(item => ({
                                value: item.value,
                                label: item.label,
                                icon: item.icon,
                                color: item.color,
                            })),
                            default: 'powerLIne',
                        },
                        {
                            name: 'powerLineIcon',
                            hidden: data => !!data.powerLineStandardIcon,
                            type: 'image',
                            label: 'vis_2_widgets_energy_custom_icon',
                        },
                        {
                            name: 'powerLineCircleSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'vis_2_widgets_energy_power_line_circle_size',
                            tooltip: 'vis_2_widgets_energy_power_line_circle_size_tooltip',
                        },
                        {
                            name: 'powerLineDistanceSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
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
                    label: 'vis_2_widgets_energy_group_node',
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
                                    data[`color${field.index}`] = object.common.color !== undefined ? object.common.color : null;
                                    data[`name${field.index}`] = object.common.name && typeof object.common.name === 'object' ? object.common.name[I18n.getLanguage()] : object.common.name;
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
                            name: 'standardIcon',
                            type: 'select',
                            label: 'vis_2_widgets_energy_standard_icon',
                            options: STANDARD_ICONS.map(item => ({
                                value: item.value,
                                label: item.label,
                                icon: item.icon,
                                color: item.color,
                            })),
                            default: '',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            hidden: (data, index) => !!data[`standardIcon${index}`],
                            label: 'vis_2_widgets_energy_custom_icon',
                        },
                        {
                            name: 'circleSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'vis_2_widgets_energy_circle_size',
                            tooltip: 'vis_2_widgets_energy_circle_size_tooltip',
                        },
                        {
                            name: 'distanceSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
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
                },
            ],
            visDefaultStyle: {
                width: 220,
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
        const units = {};

        // try to find icons for all OIDs
        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            objects[`object${i}`] = await this.loadObject(this.state.rxData[`oid${i}`], this.state.rxData[`icon${i}`]);
            units[this.state.rxData[`oid${i}`]] = objects[`object${i}`].common.unit;
        }
        objects.home = await this.loadObject(this.state.rxData['home-oid'], this.state.rxData.homeIcon);
        objects.powerLine = await this.loadObject(this.state.rxData['powerLine-oid'], this.state.rxData.powerLineIcon);
        units[this.state.rxData['home-oid']] = objects.home.common.unit;
        units[this.state.rxData['powerLine-oid']] = objects.powerLine.common.unit;

        if (JSON.stringify(objects) !== JSON.stringify(this.state.objects)) {
            this.setState({ objects, units });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.propertiesUpdate();
        this.offsetInterval = setInterval(() => {
            let offset = this.state.offset + 1;
            if (offset > 0x0FFFFFFF) {
                offset = 0;
            }
            this.setState({ offset });
        }, 50);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.offsetInterval);
    }

    onPropertiesUpdated() {
        super.onPropertiesUpdated();
        this.propertiesUpdate();
    }

    getValue(oid) {
        let value;
        if (oid) {
            value = this.state.values[`${oid}.val`];
            if (value === null || value === undefined) {
                value = '--';
            } else if (this.state.units[oid] === 'Wh') {
                value = Math.round(value / 10) / 100;
            }
        }
        return { unit: this.state.units[oid], value };
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

        const homeRadius = (size * (this.state.rxData.homeCircleSize || defaultRadiusSize)) / 100;
        const homeFontSize = defaultFontSize || this.state.rxData.homeFontSize;
        let homeIcon = this.state.rxData.homeStandardIcon || this.state.rxData.homeIcon || this.state.objects.home?.common?.icon;

        if (homeIcon && homeIcon.startsWith('_PRJ_NAME/')) {
            homeIcon = homeIcon.replace('_PRJ_NAME/', `${this.props.adapterName}.${this.props.instance}/${this.props.projectName}${homeIcon.substring(9)}`);
        }

        let maxRadius = 0;
        let valuesSum = 0;
        // prepare power line as first circle
        const valueAndUnit = this.getValue(this.state.rxData['powerLine-oid']);

        const circles = [{
            name: this.state.rxData.powerLineName,
            color: this.state.rxData.powerLineColor,
            radius: (size * (this.state.rxData.powerLineCircleSize || defaultRadiusSize)) / 100,
            distance: (size * (this.state.rxData.powerLineDistanceSize || defaultDistanceSize)) / 100,
            fontSize: defaultFontSize || this.state.rxData.powerLineFontSize,
            oid: this.state.rxData['powerLine-oid'],
            unit: valueAndUnit.unit || I18n.t('vis_2_widgets_energy_kwh'),
            value: valueAndUnit.value,
            icon: this.state.rxData.powerLineStandardIcon || this.state.rxData.powerLineIcon || this.state.objects.powerLine?.common?.icon,
            arrow: '→', // '↦',
            secondaryValue: this.getValue(this.state.rxData['powerLineReturn-oid']),
            secondaryArrow: '←',
        }];

        if (circles[0].radius > maxRadius) {
            maxRadius = circles[0].radius;
            valuesSum += Number.isFinite(circles[0].value) ? Math.abs(circles[0].value) : 0;
        }

        // add all other nodes, like solar and so on
        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            const _valueAndUnit = this.getValue(this.state.rxData[`oid${i}`]);
            const circle = {
                name: this.state.rxData[`name${i}`],
                color: this.state.rxData[`color${i}`],
                radius: (size * (this.state.rxData[`circleSize${i}`] || defaultRadiusSize)) / 100,
                distance: (size * (this.state.rxData[`distanceSize${i}`] || defaultDistanceSize)) / 100,
                fontSize: defaultFontSize || this.state.rxData[`fontSize${i}`],
                oid: this.state.rxData[`oid${i}`],
                unit: _valueAndUnit.unit || I18n.t('vis_2_widgets_energy_kwh'),
                value: _valueAndUnit.value,
                icon: this.state.rxData[`standardIcon${i}`] || this.state.rxData[`icon${i}`] || this.state.objects[`object${i}`]?.common?.icon,
                arrow: '',
            };
            circles.push(circle);

            if (circle.radius > maxRadius) {
                maxRadius = circle.radius;
            }
            valuesSum += Number.isFinite(_valueAndUnit.value) ? Math.abs(_valueAndUnit.value) : 0;
        }

        let currentPart = 0;
        const homeValueAndUnit = this.getValue(this.state.rxData['home-oid']);
        let xOffset = 0;
        // calculate max and min position of circles to place it in center
        let max = size / 2;
        let min = size / 2;
        const allCoordinates = [];
        for (let i = 0; i < circles.length; i++) {
            const angle = 180 + (i * 360) / circles.length;
            const _coordinates = polarToCartesian(0, 0, circles[i].distance + circles[i].radius + homeRadius, angle);
            const position = {
                top:       size / 2 + _coordinates.y - circles[i].radius,
                left:      size / 2 + _coordinates.x - circles[i].radius,
                topLabel:  size / 2 + _coordinates.y + circles[i].radius + 2,
                leftLabel: size / 2 + _coordinates.x - circles[i].radius,
            };
            allCoordinates.push(position);
            if (max < position.left + circles[i].radius * 2) {
                max = position.left + circles[i].radius * 2;
            }
            if (min > position.left) {
                min = position.left;
            }
        }
        // compare with home
        if (max < (size / 2 + homeRadius)) {
            max = size / 2 + homeRadius;
        }
        if (min > (size / 2 - homeRadius)) {
            min = size / 2 - homeRadius;
        }
        // if (Math.abs(size - max - min) > 5) {
        xOffset = (size - max - min) / 2;
        // }

        const standardHomeIcon = STANDARD_ICONS.find(item => item.value === homeIcon);
        const CustomHomeIcon = standardHomeIcon ? standardHomeIcon.component : null;

        const content = <div
            ref={this.refCardContent}
            className={this.props.classes.cardContent}
        >
            {size && <div style={{ position: 'relative' }}>
                {circles.map((circle, i) => {
                    const icon = circle.icon && circle.icon.startsWith('_PRJ_NAME/') ?
                        `${this.props.adapterName}.${this.props.instance}/${this.props.projectName}${circle.icon.substring(9)}`
                        :
                        circle.icon;

                    const standardIcon = STANDARD_ICONS.find(item => item.value === icon);
                    const CustomIcon = standardIcon ? standardIcon.component : null;
                    return <div key={i}>
                        <div
                            className={this.props.classes.circleContent}
                            style={{
                                top:      allCoordinates[i].top,
                                left:     xOffset + allCoordinates[i].left,
                                width:    circle.radius * 2,
                                height:   circle.radius * 2,
                                fontSize: circle.fontSize,
                            }}
                        >
                            {icon && !CustomIcon ?
                                <img src={icon} alt="" style={{ width: Math.round(circle.radius * 0.666), height: Math.round(circle.radius * 0.666) }} />
                                :
                                (CustomIcon ? <CustomIcon style={{ width: Math.round(circle.radius * 0.666), height: Math.round(circle.radius * 0.666) }} /> : null)}
                            {circle.secondaryValue?.value !== undefined ? <div style={{ color: this.state.rxData.powerLineReturnColor }}>
                                {`${circle.secondaryArrow}${circle.secondaryValue.value} ${circle.secondaryValue.unit || I18n.t('vis_2_widgets_energy_kwh')}`}
                            </div> : null}
                            {circle.value !== undefined ? <div>
                                {`${circle.arrow}${circle.value} ${circle.unit}`}
                            </div> : null}
                        </div>
                        <div
                            className={this.props.classes.circleContent}
                            style={{
                                top: allCoordinates[i].topLabel,
                                left: xOffset + allCoordinates[i].leftLabel,
                                width: circle.radius * 2,
                                fontSize: circle.fontSize,
                            }}
                        >
                            <div>{circle.name || circle.oid}</div>
                        </div>
                    </div>;
                })}
                <div
                    className={this.props.classes.circleContent}
                    style={{
                        top: size / 2 - homeRadius,
                        left: xOffset + size / 2 - homeRadius,
                        width: homeRadius * 2,
                        height: homeRadius * 2,
                        fontSize: homeFontSize,
                    }}
                >
                    {homeIcon && !CustomHomeIcon ?
                        <img src={homeIcon} alt="" style={{ width: Math.round(homeRadius * 0.666), height: Math.round(homeRadius * 0.666) }} />
                        :
                        (CustomHomeIcon ?
                            <CustomHomeIcon style={{ width: Math.round(homeRadius * 0.666), height: Math.round(homeRadius * 0.666) }} />
                            :
                            null)}
                    {homeValueAndUnit.value !== undefined ? <div>
                        {`${homeValueAndUnit.value} ${homeValueAndUnit.unit || I18n.t('vis_2_widgets_energy_kwh')}`}
                    </div> : null}
                </div>
                <div
                    className={this.props.classes.circleContent}
                    style={{
                        top: size / 2 + homeRadius,
                        left: xOffset + size / 2 - homeRadius,
                        width: homeRadius * 2,
                        fontSize: homeFontSize,
                    }}
                >
                    <div>{this.state.rxData.homeName || this.state.rxData['home-oid'] || I18n.t('vis_2_widgets_energy_home')}</div>
                </div>
                <svg style={{ width: size, height: size, overflow: 'visible' }}>
                    <circle
                        cx="50%"
                        cy="50%"
                        r={homeRadius}
                        transform={`translate(${xOffset}, 0)`}
                        fill="none"
                        stroke={this.state.rxData.homeColor || this.props.theme.palette.text.primary}
                        strokeWidth="3"
                    />
                    {valuesSum ? circles.map((circle, i) => {
                        // Show parts of home circle
                        const partRadiusStroke = ((valuesSum - (Number.isFinite(circle.value) ? Math.abs(circle.value) : 0)) / valuesSum) * (Math.PI * (homeRadius * 2));
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
                            transform={`translate(${xOffset}, 0), rotate(${Math.round((currentPart / valuesSum) * 360 + 135)},${size / 2},${size / 2})`}
                            strokeWidth="3"
                        />;
                        currentPart += Number.isFinite(circle.value) ? Math.abs(circle.value) : 0;
                        return result;
                    }) : null}
                    {circles.map((circle, i) => {
                        // Show connection lines with moving circle
                        const angle           = 180 + (i * 360) / circles.length;
                        const coordinates     = polarToCartesian(0, 0, circle.distance + circle.radius + homeRadius, angle);
                        const coordinatesFrom = polarToCartesian(0, 0, homeRadius, angle);
                        const coordinatesTo   = polarToCartesian(0, 0, homeRadius + circle.distance, angle);
                        let step = Number.isFinite(circle.value) ? Math.abs(circle.value) / 50 : 0;
                        if (step > 2) {
                            step = 2;
                        }
                        let offset = (this.state.offset * step + i * 10) % circle.distance;
                        if (circle.value > 0) {
                            offset = circle.distance - offset;
                        }

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
                                transform={`translate(${xOffset + coordinates.x}, ${coordinates.y})`}
                            />
                            <line
                                x1={xOffset + size / 2 + coordinatesFrom.x}
                                y1={size / 2 + coordinatesFrom.y}
                                x2={xOffset + size / 2 + coordinatesTo.x}
                                y2={size / 2 + coordinatesTo.y}
                                stroke={color}
                            />
                            {circle.value ? <circle
                                cx="50%"
                                cy="50%"
                                r={step < 0.5 ? 1.5 : step * 3}
                                fill={color}
                                stroke={color}
                                strokeWidth="3"
                                transform={`translate(${xOffset + coordinatesOffset.x}, ${coordinatesOffset.y})`}
                            /> : null}
                        </React.Fragment>;
                    })}
                </svg>
            </div>}
        </div>;

        return this.wrapContent(content, null, { textAlign: 'center', height: 'calc(100% - 32px)' });
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return Distribution.getWidgetInfo();
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
