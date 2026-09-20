import React from 'react';

import { Icon, Utils } from '@iobroker/gui-components';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    VisRxData,
    VisRxWidgetProps,
    VisRxWidgetState,
    WidgetData,
} from '@iobroker/types-vis-2';

import Generic from './Generic';
import { toNumber } from './Utils';

type StoredObject = {
    common: ioBroker.StateCommon;
    _id?: string;
    factor?: number;
    round?: number;
    speed?: number | string;
    hideIfLess?: number | null;
    invert?: boolean;
};

interface Circle {
    name: string;
    color?: string;
    radius: number;
    distance: number;
    fontSize: number;
    oid: string;
    unit: string;
    value?: string;
    iValue: number;
    icon?: string;
    arrow: '→' | '←' | '';
    iconSize: number;
    hide?: boolean;
    invert: boolean;
    speed: number;
    textColor: string;
    value2?: number;
    value2Unit?: string;
    secondaryValue?: { value?: string; unit?: string; iValue: number } | null;
    secondaryArrow?: '→' | '←' | '';
}

interface DistributionState extends VisRxWidgetState {
    objects: Record<string, StoredObject>;
    units: Record<string, string | undefined>;
}

interface DistributionRxData extends VisRxData {
    noCard: boolean;
    widgetTitle: string;
    defaultColor: string;
    defaultCircleSize: number | string;
    defaultDistanceSize: number | string;
    defaultFontSize: number | string;
    defaultRadiusSize: number | string;
    nodesCount: number;
    lineWidth: number | string;
    noAnimation: boolean;
    rawValues: boolean;

    'home-oid': string;
    homeName: string;
    homeColor: string;
    homeTextColor: string;
    homeStandardIcon: string;
    homeIcon: string;
    homeCircleSize: number | string;
    homeDistanceSize: number | string;
    homeFontSize: number | string;
    homeIconSize: number | string;
    homeUnit: string;
    homeFactor: number | string;
    homeRound: number | string;

    'powerLine-oid': string;
    'powerLineReturn-oid': string;
    powerLineName: string;
    powerLineColor: string;
    powerLineTextColor: string;
    powerLineReturnColor: string;
    powerLineStandardIcon: string;
    powerLineIcon: string;
    powerLineCircleSize: number | string;
    powerLineDistanceSize: number | string;
    powerLineFontSize: number | string;
    powerIconSize: number | string;
    powerUnit: string;
    powerFactor: number | string;
    powerRound: number | string;
    powerSpeed: number | string;
    powerHideIfLess: number | string;
    powerInvert: boolean | 'true' | 'false';

    [key: `oid${number}`]: string;
    [key: `name${number}`]: string;
    [key: `color${number}`]: string;
    [key: `textColor${number}`]: string;
    [key: `returnColor${number}`]: string;
    [key: `standardIcon${number}`]: string;
    [key: `icon${number}`]: string;
    [key: `circleSize${number}`]: number | string;
    [key: `distanceSize${number}`]: number | string;
    [key: `fontSize${number}`]: number | string;
    [key: `iconSize${number}`]: number | string;
    [key: `unit${number}`]: string;
    [key: `factor${number}`]: number | string;
    [key: `round${number}`]: number | string;
    [key: `speed${number}`]: number | string;
    [key: `hideIfLess${number}`]: number | string;
    [key: `invert${number}`]: boolean | 'true' | 'false';
    [key: `value2Oid${number}`]: string;
    [key: `value2Unit${number}`]: string;
}

const styles: Record<string, React.CSSProperties> = {
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
};

function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
): { x: number; y: number } {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
        x: Math.round((centerX + radius * Math.cos(angleInRadians)) * 100) / 100,
        y: Math.round((centerY + radius * Math.sin(angleInRadians)) * 100) / 100,
    };
}

class Distribution extends Generic<DistributionRxData, DistributionState> {
    private readonly refCardContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    private lastRxData?: string;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = { ...this.state, objects: {}, units: {} };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2Distribution',
            visSet: 'vis-2-widgets-energy',
            visSetLabel: 'set_label', // Label of widget set
            visWidgetLabel: 'distribution', // Label of widget
            visHelp: 'help_distribution', // Description in the palette
            visName: 'Distribution',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            tooltip: 'without_card_tooltip',
                            type: 'checkbox',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            tooltip: 'widget_title_tooltip',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'defaultColor',
                            type: 'color',
                            label: 'default_color',
                            tooltip: 'default_color_tooltip',
                        },
                        {
                            name: 'defaultCircleSize',
                            type: 'number',
                            label: 'default_circle_size',
                            tooltip: 'default_circle_size_tooltip',
                            default: 10,
                        },
                        {
                            name: 'defaultDistanceSize',
                            type: 'number',
                            label: 'default_distance_size',
                            tooltip: 'default_distance_size_tooltip',
                            default: 18,
                        },
                        {
                            name: 'defaultFontSize',
                            type: 'number',
                            label: 'default_font_size',
                            tooltip: 'default_font_size_tooltip',
                            default: 12,
                        },
                        {
                            name: 'defaultRadiusSize',
                            type: 'number',
                            label: 'default_radius_size',
                            tooltip: 'default_radius_size_tooltip',
                            default: 10,
                        },
                        {
                            name: 'nodesCount',
                            type: 'slider',
                            min: 0,
                            max: 10,
                            label: 'nodes_count',
                            tooltip: 'nodes_count_tooltip',
                        },
                        {
                            name: 'lineWidth',
                            type: 'slider',
                            min: 1,
                            max: 10,
                            default: 3,
                            label: 'line_width',
                            tooltip: 'line_width_tooltip',
                        },
                        {
                            name: 'noAnimation',
                            type: 'checkbox',
                            label: 'no_animation',
                            tooltip: 'distribution_no_animation_tooltip',
                        },
                        {
                            name: 'rawValues',
                            type: 'checkbox',
                            label: 'raw_values',
                            tooltip: 'raw_values_tooltip',
                        },
                    ],
                },
                {
                    name: 'home',
                    label: 'group_home',
                    fields: [
                        {
                            name: 'home-oid',
                            type: 'id',
                            label: 'home_oid',
                            tooltip: 'home_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name!]);
                                if (object && object.common) {
                                    data.homeColor = object.common.color !== undefined ? object.common.color : null;
                                    data.homeName = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                            noInit: true,
                        },
                        {
                            name: 'homeName',
                            label: 'home_name',
                            tooltip: 'home_name_tooltip',
                        },
                        {
                            name: 'homeColor',
                            type: 'color',
                            label: 'home_color',
                            tooltip: 'home_color_tooltip',
                        },
                        {
                            name: 'homeTextColor',
                            type: 'color',
                            label: 'text_color',
                            tooltip: 'text_color_tooltip',
                        },
                        {
                            name: 'homeStandardIcon',
                            type: 'icon64',
                            label: 'standard_icon',
                            tooltip: 'standard_icon_tooltip',
                            hidden: (data: WidgetData) => !!data.homeIcon,
                            default:
                                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSA5LjNWNGgtM3YyLjZMMTIgM0wyIDEyaDN2OGg1di02aDR2Nmg1di04aDNsLTMtMi43em0tOSAuN2MwLTEuMS45LTIgMi0yczIgLjkgMiAyaC00eiIvPjwvc3ZnPg==',
                        },
                        {
                            name: 'homeIcon',
                            type: 'image',
                            hidden: (data: WidgetData) => !!data.homeStandardIcon,
                            label: 'custom_icon',
                            tooltip: 'custom_icon_tooltip',
                        },
                        {
                            name: 'homeCircleSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'home_circle_size',
                            tooltip: 'home_circle_size_tooltip',
                        },
                        {
                            name: 'homeDistanceSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'home_distance_size',
                            tooltip: 'home_distance_size_tooltip',
                        },
                        {
                            name: 'homeFontSize',
                            type: 'number',
                            label: 'home_font_size',
                            tooltip: 'home_font_size_tooltip',
                        },
                        {
                            name: 'homeIconSize',
                            type: 'slider',
                            label: 'icon_size',
                            tooltip: 'icon_size_tooltip',
                            min: 0,
                            max: 230,
                            hidden: (data: WidgetData) => !data.homeIcon && !data.homeStandardIcon,
                        },
                        {
                            name: 'homeUnit',
                            label: 'units',
                            tooltip: 'units_tooltip',
                        },
                        {
                            name: 'homeFactor',
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
                            label: 'factor',
                            default: '1',
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'homeRound',
                            type: 'slider',
                            min: 0,
                            max: 6,
                            label: 'round',
                            tooltip: 'round_tooltip',
                            default: 2,
                        },
                    ],
                },
                {
                    name: 'powerLine',
                    label: 'group_powerLine',
                    fields: [
                        {
                            name: 'powerLine-oid',
                            type: 'id',
                            label: 'power_line_oid',
                            tooltip: 'power_line_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name!]);
                                if (object && object.common) {
                                    data.powerLineColor =
                                        object.common.color !== undefined ? object.common.color : null;
                                    data.powerLineName = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                            noInit: true,
                        },
                        {
                            name: 'powerLineReturn-oid',
                            type: 'id',
                            label: 'power_line_return_oid',
                            tooltip: 'power_line_return_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name!]);
                                if (object && object.common) {
                                    data.powerLineColor =
                                        object.common.color !== undefined ? object.common.color : null;
                                    data.powerLineName = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'powerLineName',
                            label: 'power_line_name',
                            tooltip: 'power_line_name_tooltip',
                        },
                        {
                            name: 'powerLineColor',
                            type: 'color',
                            label: 'power_line_color',
                            tooltip: 'power_line_color_tooltip',
                        },
                        {
                            name: 'powerLineTextColor',
                            type: 'color',
                            label: 'text_color',
                            tooltip: 'text_color_tooltip',
                        },
                        {
                            name: 'powerLineReturnColor',
                            hidden: (data: WidgetData) => !data['powerLineReturn-oid'],
                            type: 'color',
                            label: 'power_line_return_color',
                            tooltip: 'power_line_return_color_tooltip',
                            default: '#208020',
                        },
                        {
                            name: 'powerLineStandardIcon',
                            type: 'icon64',
                            label: 'standard_icon',
                            tooltip: 'standard_icon_tooltip',
                            default:
                                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NzAgNDcwIiB3aWR0aD0iNDcwIiBoZWlnaHQ9IjQ3MCI+DQogICAgPHBhdGgNCiAgICAgICAgZmlsbD0iY3VycmVudENvbG9yIg0KICAgICAgICBkPSJNNDIwLjYzNCwxNjkuNDIyYy0wLjAwMi0wLjAyNS0wLjAwMy0wLjA1LTAuMDA2LTAuMDc0Yy0wLjA3Ni0wLjcyNS0wLjI1NS0xLjQxNi0wLjUyMy0yLjA2NQ0KYy0wLjAxNS0wLjAzNy0wLjAyOS0wLjA3My0wLjA0NS0wLjEwOWMtMC4yNjktMC42MjMtMC42MTctMS4xOTgtMS4wMzctMS43MmMtMC4wNDctMC4wNTktMC4wOTUtMC4xMTctMC4xNDQtMC4xNzQNCmMtMC4yNTItMC4yOTUtMC41MjUtMC41Ny0wLjgyLTAuODIzYy0wLjA0NC0wLjAzOC0wLjA4NC0wLjA3OS0wLjEyOS0wLjExNmMtMC4xNDItMC4xMTYtMC4yOS0wLjIyMy0wLjQ0LTAuMzI5DQpjLTAuMTE2LTAuMDgyLTAuMjM0LTAuMTU4LTAuMzU1LTAuMjMzYy0wLjE4MS0wLjExMy0wLjM2NC0wLjIxOS0wLjU1NS0wLjMxNmMtMC4xOTgtMC4xMDItMC40LTAuMTk2LTAuNjA3LTAuMjc5DQpjLTAuMDYxLTAuMDI0LTAuMTE3LTAuMDU5LTAuMTc4LTAuMDgybC0xMjEuMTU0LTUyLjExNVY2OS4yMTFoMTExLjAyOHYzMS40OWMwLDQuMTQyLDMuMzU4LDcuNSw3LjUsNy41czcuNS0zLjM1OCw3LjUtNy41VjYyLjEwOA0KYzAuMDA3LTAuMTMyLDAuMDItMC4yNjMsMC4wMi0wLjM5N2MwLTAuMjQzLTAuMDMzLTAuNDc2LTAuMDU2LTAuNzEzYy0wLjAwMi0wLjAyNS0wLjAwMy0wLjA1LTAuMDA2LTAuMDc0DQpjLTAuMDc2LTAuNzI1LTAuMjU1LTEuNDE2LTAuNTIzLTIuMDY1Yy0wLjAxNS0wLjAzNy0wLjAyOS0wLjA3My0wLjA0NS0wLjEwOWMtMC4yNjktMC42MjMtMC42MTctMS4xOTgtMS4wMzctMS43Mg0KYy0wLjA0Ny0wLjA1OS0wLjA5NS0wLjExNy0wLjE0NC0wLjE3NGMtMC4yNTItMC4yOTUtMC41MjUtMC41Ny0wLjgyLTAuODIzYy0wLjA0NC0wLjAzOC0wLjA4NC0wLjA3OS0wLjEyOS0wLjExNg0KYy0wLjE0Mi0wLjExNi0wLjI5LTAuMjIzLTAuNDQtMC4zMjljLTAuMTE2LTAuMDgyLTAuMjM0LTAuMTU4LTAuMzU1LTAuMjMzYy0wLjE4MS0wLjExMy0wLjM2NC0wLjIxOS0wLjU1NS0wLjMxNg0KYy0wLjE5OC0wLjEwMi0wLjQtMC4xOTYtMC42MDctMC4yNzljLTAuMDYxLTAuMDI0LTAuMTE3LTAuMDU5LTAuMTc4LTAuMDgyTDI5MC4xMDcsMC42MUMyODkuMTk1LDAuMjE5LDI4OC4xOTUsMCwyODcuMTQzLDBIMTgyLjgzNw0KYy0xLjA1MiwwLTIuMDUyLDAuMjE5LTIuOTYxLDAuNjA5QzE3OS44NzMsMC42MSw1My45Miw1NC43OSw1My45Miw1NC43OWMtMC4wMjMsMC4wMS0wLjA0NiwwLjAyLTAuMDY5LDAuMDMNCmMtMC4wODMsMC4wMzYtMC4xNTYsMC4wNzYtMC4yMzIsMC4xMTJjLTAuMTk4LDAuMDk0LTAuMzkxLDAuMTk0LTAuNTgsMC4zMDRjLTAuMTMxLDAuMDc2LTAuMjYyLDAuMTUyLTAuMzg3LDAuMjM1DQpjLTAuMDY1LDAuMDQzLTAuMTI1LDAuMDkxLTAuMTg5LDAuMTM2Yy0wLjEyNywwLjA5LTAuMjUyLDAuMTgxLTAuMzcyLDAuMjc4Yy0wLjA2LDAuMDQ5LTAuMTE4LDAuMTAxLTAuMTc3LDAuMTUyDQpjLTAuMTE2LDAuMS0wLjIyOSwwLjIwMS0wLjMzOCwwLjMwOGMtMC4wNTksMC4wNTctMC4xMTUsMC4xMTYtMC4xNzEsMC4xNzVjLTAuMTAxLDAuMTA1LTAuMTk5LDAuMjEyLTAuMjkzLDAuMzIzDQpjLTAuMDU4LDAuMDY3LTAuMTE0LDAuMTM2LTAuMTY5LDAuMjA1Yy0wLjA4NSwwLjEwNy0wLjE2NiwwLjIxNi0wLjI0NSwwLjMyN2MtMC4wNTYsMC4wNzgtMC4xMTEsMC4xNTYtMC4xNjQsMC4yMzYNCmMtMC4wNywwLjEwOC0wLjEzNSwwLjIxOS0wLjIsMC4zMjljLTAuMDUxLDAuMDg4LTAuMTA0LDAuMTc0LTAuMTUyLDAuMjY0Yy0wLjA2MSwwLjExNi0wLjExNSwwLjIzNS0wLjE3MSwwLjM1NA0KYy0wLjA2MSwwLjEzMi0wLjEyLDAuMjY1LTAuMTc0LDAuNGMtMC4wNjIsMC4xNTYtMC4xMjIsMC4zMTItMC4xNzMsMC40NzJjLTAuMDI5LDAuMDkxLTAuMDUyLDAuMTg1LTAuMDc3LDAuMjc4DQpjLTAuMDM3LDAuMTMyLTAuMDczLDAuMjY1LTAuMTAzLDAuMzk5Yy0wLjAyLDAuMDkxLTAuMDM1LDAuMTgzLTAuMDUyLDAuMjc1Yy0wLjAyNiwwLjE0NS0wLjA0OSwwLjI5LTAuMDY3LDAuNDM3DQpjLTAuMDEsMC4wODUtMC4wMTksMC4xNy0wLjAyNiwwLjI1NmMtMC4wMTQsMC4xNjItMC4wMjEsMC4zMjQtMC4wMjUsMC40ODdjLTAuMDAxLDAuMDUxLTAuMDA4LDAuMS0wLjAwOCwwLjE1djM4Ljk5DQpjMCw0LjE0MiwzLjM1OCw3LjUsNy41LDcuNXM3LjUtMy4zNTgsNy41LTcuNXYtMzEuNDloMTExLjAyOHY0MS43NzNMNTMuOTIsMTYzLjIxMmMtMC4wMjMsMC4wMS0wLjA0NiwwLjAyLTAuMDY5LDAuMDMNCmMtMC4wODMsMC4wMzYtMC4xNTYsMC4wNzYtMC4yMzIsMC4xMTJjLTAuMTk4LDAuMDk0LTAuMzkxLDAuMTk0LTAuNTgsMC4zMDRjLTAuMTMxLDAuMDc2LTAuMjYyLDAuMTUyLTAuMzg3LDAuMjM1DQpjLTAuMDY1LDAuMDQzLTAuMTI1LDAuMDkxLTAuMTg5LDAuMTM2Yy0wLjEyNywwLjA5LTAuMjUyLDAuMTgxLTAuMzcyLDAuMjc4Yy0wLjA2LDAuMDQ5LTAuMTE4LDAuMTAxLTAuMTc3LDAuMTUyDQpjLTAuMTE2LDAuMS0wLjIyOSwwLjIwMS0wLjMzOCwwLjMwOGMtMC4wNTksMC4wNTctMC4xMTUsMC4xMTYtMC4xNzEsMC4xNzVjLTAuMTAxLDAuMTA1LTAuMTk5LDAuMjEyLTAuMjkzLDAuMzIzDQpjLTAuMDU4LDAuMDY3LTAuMTE0LDAuMTM2LTAuMTY5LDAuMjA1Yy0wLjA4NSwwLjEwNy0wLjE2NiwwLjIxNi0wLjI0NSwwLjMyN2MtMC4wNTYsMC4wNzgtMC4xMTEsMC4xNTYtMC4xNjQsMC4yMzYNCmMtMC4wNywwLjEwOC0wLjEzNSwwLjIxOS0wLjIsMC4zMjljLTAuMDUxLDAuMDg4LTAuMTA0LDAuMTc0LTAuMTUyLDAuMjY0Yy0wLjA2MSwwLjExNi0wLjExNSwwLjIzNS0wLjE3MSwwLjM1NA0KYy0wLjA2MSwwLjEzMi0wLjEyLDAuMjY1LTAuMTc0LDAuNGMtMC4wNjIsMC4xNTYtMC4xMjIsMC4zMTItMC4xNzMsMC40NzJjLTAuMDI5LDAuMDkxLTAuMDUyLDAuMTg1LTAuMDc3LDAuMjc4DQpjLTAuMDM3LDAuMTMyLTAuMDczLDAuMjY1LTAuMTAzLDAuMzk5Yy0wLjAyLDAuMDkxLTAuMDM1LDAuMTgzLTAuMDUyLDAuMjc1Yy0wLjAyNiwwLjE0NS0wLjA0OSwwLjI5LTAuMDY3LDAuNDM3DQpjLTAuMDEsMC4wODUtMC4wMTksMC4xNy0wLjAyNiwwLjI1NmMtMC4wMTQsMC4xNjItMC4wMjEsMC4zMjQtMC4wMjUsMC40ODdjLTAuMDAxLDAuMDUxLTAuMDA4LDAuMS0wLjAwOCwwLjE1djM4Ljk5DQpjMCw0LjE0MiwzLjM1OCw3LjUsNy41LDcuNXM3LjUtMy4zNTgsNy41LTcuNXYtMzEuNDloMTA4LjMxN0w4NC4wMjMsNDYwLjI1NmMtMC4wMDgsMC4wMjYtMC4wMSwwLjA1My0wLjAxOCwwLjA3OQ0KYy0wLjEwNywwLjM1Ny0wLjE5LDAuNzIxLTAuMjQzLDEuMDg4Yy0wLjAwNCwwLjAyOC0wLjAxMSwwLjA1NS0wLjAxNSwwLjA4M2MtMC4wNDgsMC4zNTktMC4wNjIsMC43MjEtMC4wNTgsMS4wODMNCmMwLjAwMSwwLjA3MiwwLDAuMTQzLDAuMDAzLDAuMjE1YzAuMDE0LDAuMzUxLDAuMDUzLDAuNywwLjExNiwxLjA0N2MwLjAxMSwwLjA2LDAuMDI1LDAuMTE4LDAuMDM3LDAuMTc4DQpjMC4xNDgsMC43MTUsMC40MDMsMS40MTIsMC43NjMsMi4wN2MwLjAyOCwwLjA1MSwwLjA1NCwwLjEwMSwwLjA4MywwLjE1MWMwLjE3OCwwLjMwNywwLjM3OCwwLjYwNCwwLjYwMywwLjg5DQpjMC4wNDIsMC4wNTMsMC4wODgsMC4xMDMsMC4xMzEsMC4xNTVjMC4wOTIsMC4xMTEsMC4xOCwwLjIyNCwwLjI3OSwwLjMzYzAuMTI2LDAuMTM1LDAuMjYyLDAuMjU3LDAuMzk2LDAuMzgNCmMwLjA0MSwwLjAzOCwwLjA3OCwwLjA3OCwwLjEyLDAuMTE1YzAuMjg1LDAuMjUyLDAuNTg3LDAuNDc1LDAuODk5LDAuNjc2YzAuMDI1LDAuMDE2LDAuMDQ1LDAuMDM3LDAuMDcsMC4wNTMNCmMwLjAzNCwwLjAyMSwwLjA3LDAuMDM1LDAuMTA0LDAuMDU1YzAuMjQ4LDAuMTUsMC41MDEsMC4yODcsMC43NjEsMC40MDZjMC4wMzgsMC4wMTgsMC4wNzUsMC4wMzksMC4xMTQsMC4wNTYNCmMwLjI5NCwwLjEyOCwwLjU5MywwLjIzNiwwLjg5OCwwLjMyNmMwLjA2OSwwLjAyLDAuMTM5LDAuMDM1LDAuMjA5LDAuMDUzYzAuMjM3LDAuMDYyLDAuNDc3LDAuMTEzLDAuNzE4LDAuMTUxDQpjMC4wODgsMC4wMTQsMC4xNzYsMC4wMjksMC4yNjQsMC4wNGMwLjMwMiwwLjAzNywwLjYwNiwwLjA2MywwLjkxMSwwLjA2M2MxLjYyMSwwLDMuMjMzLTAuNTE0LDQuNTgxLTEuNTUyDQpjMC4xOTEtMC4xNDcsMC4zNzYtMC4zMDQsMC41NTUtMC40NzFsMjEzLjY2My0xOTkuOTYzbDUzLjE1MSwxNjkuNTM5bC0xMDEuMDU2LTk0LjU3NmMtMy4wMjUtMi44My03Ljc3MS0yLjY3My0xMC42MDEsMC4zNTENCnMtMi42NzMsNy43NzEsMC4zNTEsMTAuNjAxbDEyMS44NjIsMTE0LjA0N2MxLjQyOCwxLjMzNiwzLjI3MSwyLjAyNCw1LjEyNywyLjAyNGMxLjM3NywwLDIuNzYxLTAuMzc4LDMuOTg5LTEuMTUNCmMyLjg4NC0xLjgxMyw0LjE4NS01LjM0MiwzLjE2Ni04LjU5M2wtODguNjAyLTI4Mi42MjJoMTA4LjMxN3YzMS40OWMwLDQuMTQyLDMuMzU4LDcuNSw3LjUsNy41czcuNS0zLjM1OCw3LjUtNy41di0zOC41OTQNCmMwLjAwNy0wLjEzMiwwLjAyLTAuMjYzLDAuMDItMC4zOTdDNDIwLjY5MSwxNjkuODkyLDQyMC42NTgsMTY5LjY1OCw0MjAuNjM1LDE2OS40MjF6IE0xOTAuMzM3LDE2Mi42MzR2LTM5LjIxMWg4OS4zMDd2MzkuMjExDQpIMTkwLjMzN3ogTTI5NC42NDMsNTQuMjExVjE4Ljg5MWw4Mi4xMTIsMzUuMzIxSDI5NC42NDN6IE0xOTAuMzM3LDE1aDg5LjMwN3YzOS4yMTFoLTg5LjMwN1YxNXogTTkzLjIyNSw1NC4yMTFsODIuMTEyLTM1LjMyMQ0KdjM1LjMyMUg5My4yMjV6IE0yNzkuNjQzLDY5LjIxMXYzOS4yMTFoLTg5LjMwN1Y2OS4yMTFIMjc5LjY0M3ogTTE3NS4zMzcsMTI3LjMxM3YzNS4zMjFIOTMuMjI1TDE3NS4zMzcsMTI3LjMxM3ogTTE2MC4wMTIsMjY4LjAxMw0KbDY0LjAwMiw1OS44OThsLTExNy4xNTIsMTA5LjY0TDE2MC4wMTIsMjY4LjAxM3ogTTMwNC45ODksMjUyLjEyOWwtNjkuOTk5LDY1LjUxbC02OS45OTgtNjUuNTFsMjMuMzU0LTc0LjQ5NWg5My4yODkNCkwzMDQuOTg5LDI1Mi4xMjl6IE0yOTQuNjQzLDE2Mi42MzR2LTM1LjMyMWw4Mi4xMTIsMzUuMzIySDI5NC42NDR6Ig0KICAgIC8+DQo8L3N2Zz4=',
                            hidden: (data: WidgetData) => !!data.powerLineIcon,
                        },
                        {
                            name: 'powerLineIcon',
                            hidden: (data: WidgetData) => !!data.powerLineStandardIcon,
                            type: 'image',
                            label: 'custom_icon',
                            tooltip: 'custom_icon_tooltip',
                        },
                        {
                            name: 'powerLineCircleSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'power_line_circle_size',
                            tooltip: 'power_line_circle_size_tooltip',
                        },
                        {
                            name: 'powerLineDistanceSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'power_line_distance_size',
                            tooltip: 'power_line_distance_size_tooltip',
                        },
                        {
                            name: 'powerLineFontSize',
                            type: 'number',
                            label: 'power_line_font_size',
                            tooltip: 'power_line_font_size_tooltip',
                        },
                        {
                            name: 'powerIconSize',
                            type: 'slider',
                            label: 'icon_size',
                            tooltip: 'icon_size_tooltip',
                            hidden: (data: WidgetData) => !data.powerLineIcon && !data.powerLineStandardIcon,
                            min: 0,
                            max: 230,
                        },
                        {
                            name: 'powerUnit',
                            label: 'units',
                            tooltip: 'units_tooltip',
                        },
                        {
                            name: 'powerFactor',
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
                            label: 'factor',
                            default: '1',
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'powerRound',
                            type: 'slider',
                            min: 0,
                            max: 6,
                            label: 'round',
                            tooltip: 'round_tooltip',
                            default: 2,
                        },
                        {
                            name: 'powerHideIfLess',
                            type: 'number',
                            label: 'hide_if_less',
                            tooltip: 'hide_if_less_tooltip',
                        },
                        {
                            name: 'powerInvert',
                            type: 'checkbox',
                            label: 'invert_direction',
                            tooltip: 'invert_direction_tooltip',
                        },
                        {
                            name: 'powerSpeed',
                            type: 'slider',
                            min: 2,
                            max: 50,
                            default: 50,
                            label: 'motion_speed',
                            tooltip: 'motion_speed_tooltip',
                        },
                    ],
                },
                {
                    name: 'node',
                    label: 'group_node',
                    indexFrom: 1,
                    indexTo: 'nodesCount',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                            label: 'oid',
                            tooltip: 'node_oid_tooltip',
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name!]);
                                if (object && object.common) {
                                    data[`color${field.index}`] =
                                        object.common.color !== undefined ? object.common.color : null;
                                    data[`name${field.index}`] = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                            noInit: true,
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
                            name: 'textColor',
                            type: 'color',
                            label: 'text_color',
                            tooltip: 'text_color_tooltip',
                        },
                        {
                            name: 'standardIcon',
                            type: 'icon64',
                            label: 'standard_icon',
                            tooltip: 'standard_icon_tooltip',
                            hidden: (data, index) => !!data[`icon${index}`],
                            default: '',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            hidden: (data, index) => !!data[`standardIcon${index}`],
                            label: 'custom_icon',
                            tooltip: 'custom_icon_tooltip',
                        },
                        {
                            name: 'circleSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'circle_size',
                            tooltip: 'circle_size_tooltip',
                        },
                        {
                            name: 'distanceSize',
                            type: 'slider',
                            min: 0,
                            max: 50,
                            label: 'distance_size',
                            tooltip: 'distance_size_tooltip',
                        },
                        {
                            name: 'fontSize',
                            type: 'number',
                            label: 'font_size',
                            tooltip: 'font_size_tooltip',
                        },
                        {
                            name: 'iconSize',
                            type: 'slider',
                            label: 'icon_size',
                            tooltip: 'icon_size_tooltip',
                            min: 0,
                            max: 230,
                            hidden: (data, index) => !data[`standardIcon${index}`] && !data[`icon${index}`],
                        },
                        {
                            name: 'unit',
                            label: 'units',
                            tooltip: 'units_tooltip',
                        },
                        {
                            name: 'factor',
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
                            label: 'factor',
                            default: '1',
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'round',
                            type: 'slider',
                            min: 0,
                            max: 6,
                            label: 'round',
                            tooltip: 'round_tooltip',
                            default: 2,
                        },
                        {
                            name: 'hideIfLess',
                            type: 'number',
                            label: 'hide_if_less',
                            tooltip: 'hide_if_less_tooltip',
                        },
                        {
                            name: 'invert',
                            type: 'checkbox',
                            label: 'invert_direction',
                            tooltip: 'invert_direction_tooltip',
                        },
                        {
                            name: 'speed',
                            type: 'slider',
                            min: 2,
                            max: 50,
                            default: 50,
                            label: 'motion_speed',
                            tooltip: 'motion_speed_tooltip',
                        },
                        {
                            name: 'value2Oid',
                            type: 'id',
                            label: 'value2',
                            tooltip: 'value2_tooltip',
                        },
                        {
                            name: 'value2Unit',
                            label: 'value2_unit',
                            tooltip: 'value2_unit_tooltip',
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

    async loadObject(oid: string, iconExists?: boolean): Promise<StoredObject> {
        if (oid) {
            // read object itself
            const object = await this.props.context.socket.getObject(oid);
            if (!object) {
                return { common: {} } as StoredObject;
            }
            object.common ||= {} as ioBroker.StateCommon;
            if (!iconExists && !object.common.icon && (object.type === 'state' || object.type === 'channel')) {
                const idArray = oid.split('.');

                // read channel
                const parentObject = await this.props.context.socket.getObject(idArray.slice(0, -1).join('.'));
                if (parentObject?.common?.icon) {
                    object.common.icon = parentObject.common.icon;
                } else if (object.type === 'state' || object.type === 'channel') {
                    const grandParentObject = await this.props.context.socket.getObject(idArray.slice(0, -2).join('.'));
                    if (grandParentObject?.common?.icon) {
                        object.common.icon = grandParentObject.common.icon;
                    }
                }
            }
            return { common: object.common as ioBroker.StateCommon, _id: object._id };
        }
        return { common: {} as ioBroker.StateCommon };
    }

    async propertiesUpdate() {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        this.lastRxData = actualRxData;

        const objects: Record<string, StoredObject> = {};
        const units: Record<string, string | undefined> = {};

        // try to find icons for all OIDs
        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            const idx = `object${i}`;
            objects[idx] = await this.loadObject(this.state.rxData[`oid${i}`], !!this.state.rxData[`icon${i}`]);
            if (this.state.rxData[`unit${i}`]) {
                objects[idx].common.unit = this.state.rxData[`unit${i}`];
            }
            objects[idx].factor = parseFloat(this.state.rxData[`factor${i}`] as string) || 1;

            let n = this.state.rxData[`round${i}`];
            objects[idx].round = n === undefined || n === null || n === '' ? 2 : parseFloat(n as string) || 0;

            n = this.state.rxData[`speed${i}`];
            objects[idx].speed = n === undefined || n === null || n === '' ? 50 : parseFloat(n as string) || 50;

            n = this.state.rxData[`hideIfLess${i}`];
            objects[idx].hideIfLess = n === undefined || n === null || n === '' ? null : parseFloat(n as string) || 0;

            const invert = this.state.rxData[`invert${i}`];
            objects[idx].invert = invert === true || invert === 'true';

            units[this.state.rxData[`oid${i}`]] = objects[idx].common.unit;

            // resolve OID 2's unit from its own datapoint object (#416, #74)
            if (this.state.rxData[`value2Oid${i}`]) {
                const value2Object = await this.loadObject(this.state.rxData[`value2Oid${i}`], true);
                units[this.state.rxData[`value2Oid${i}`]] = value2Object?.common?.unit;
            }
        }
        // home
        objects.home = await this.loadObject(this.state.rxData['home-oid'], !!this.state.rxData.homeIcon);
        if (this.state.rxData.homeUnit) {
            objects.home.common.unit = this.state.rxData.homeUnit;
        }
        objects.home.factor = parseFloat(this.state.rxData.homeFactor as string) || 1;
        let n = this.state.rxData.homeRound;
        objects.home.round = n === undefined || n === null || n === '' ? 2 : parseFloat(n as string) || 0;

        objects.home.hideIfLess = null;

        // power line
        objects.powerLine = await this.loadObject(
            this.state.rxData['powerLine-oid'],
            !!this.state.rxData.powerLineIcon,
        );
        if (this.state.rxData.powerUnit) {
            objects.powerLine.common.unit = this.state.rxData.powerUnit;
        }
        objects.powerLine.factor = parseFloat(this.state.rxData.powerFactor as string) || 1;

        const invert = this.state.rxData.powerInvert;
        objects.powerLine.invert = invert === true || invert === 'true';

        n = this.state.rxData.powerRound;
        objects.powerLine.round = n === undefined || n === null || n === '' ? 2 : parseFloat(n as string) || 0;

        n = this.state.rxData.powerSpeed;
        objects.powerLine.speed = n === undefined || n === null || n === '' ? 50 : parseFloat(n as string) || 50;

        n = this.state.rxData.powerHideIfLess;
        objects.powerLine.hideIfLess = n === undefined || n === null || n === '' ? null : parseFloat(n as string) || 0;

        units[this.state.rxData['home-oid']] = objects.home.common.unit;
        units[this.state.rxData['powerLine-oid']] = objects.powerLine.common.unit;
        // the feed-back (return) value shares the power line's unit; register it so
        // that a changed power line unit is also applied to the return value (#212)
        units[this.state.rxData['powerLineReturn-oid']] = objects.powerLine.common.unit;

        if (JSON.stringify(objects) !== JSON.stringify(this.state.objects)) {
            this.setState({ objects, units });
        }
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    onRxDataChanged() {
        this.propertiesUpdate();
    }

    getValue(oid: string, obj: StoredObject): { unit?: string; value?: string; iValue: number } {
        if (!oid) {
            return { unit: undefined, value: undefined, iValue: 0 };
        }

        let unit = this.state.units[oid];
        const raw = this.state.values[`${oid}.val`];

        if (raw === null || raw === undefined) {
            return { unit, value: '--', iValue: 0 };
        }

        let value = toNumber(raw) ?? 0;

        // Historic behaviour: a datapoint in Wh is shown in kWh. It used to divide the value but keep the
        // unit "Wh", so 1500 Wh appeared as "1.5 Wh" - the unit is corrected together with the value now.
        // `rawValues` switches the whole conversion off and shows the datapoint as it is.
        if (!this.state.rxData.rawValues && unit === 'Wh') {
            value = Math.round(value / 10) / 100;
            unit = 'kWh';
        }
        if (obj?.factor && obj.factor !== 1) {
            value *= obj.factor;
        }
        // @ts-expect-error types must be fixed in vis-2
        const formatted: string = this.formatValue(value, obj?.round ?? 2);

        return {
            unit,
            value: formatted,
            iValue: toNumber(formatted) ?? 0,
        };
    }

    /**
     * Unit shown next to a value when neither the datapoint nor the widget configuration names one
     *
     * @returns `kWh` for the historic behaviour, nothing when the raw values were requested
     */
    getFallbackUnit(): string {
        return this.state.rxData.rawValues ? '' : Generic.t('kwh');
    }

    /**
     * Where and how fast the dot on a connection line moves.
     *
     * The speed follows the value exactly as before - `|value| / speed` pixels every 50 ms, capped at 2 px -
     * but instead of moving the dot by hand on every tick, that step is converted into the time the dot needs
     * for the whole line and the browser animates it.
     *
     * @param circle - the node the line belongs to
     * @param index - position of the node, used to keep the dots out of sync
     * @returns How to draw the dot, or null when there is no flow to show
     */
    getMotion(
        circle: Circle,
        index: number,
    ): { duration: number; begin: number; toHome: boolean; dotRadius: number; animated: boolean } | null {
        if (!circle.iValue || !Number.isFinite(circle.iValue)) {
            return null;
        }

        const step = Math.min(Math.abs(circle.iValue) / circle.speed, 2);
        const dotRadius = step < 0.5 ? 1.5 : step * 3;
        // A positive value flows towards the home circle, unless the direction of the node was inverted
        const toHome = circle.invert ? circle.iValue < 0 : circle.iValue > 0;

        if (this.state.rxData.noAnimation || !step || !circle.distance) {
            return { duration: 0, begin: 0, toHome, dotRadius, animated: false };
        }

        const duration = Math.max(Math.round((circle.distance / step) * 0.05 * 100) / 100, 0.1);
        // A negative `begin` starts the animation as if it had been running for that long, which spreads the
        // dots of the nodes over the cycle instead of letting them all start at the home circle together
        const begin = -Math.round(((index % 5) * duration) / 5 * 100) / 100;

        return { duration, begin, toHome, dotRadius, animated: true };
    }

    renderWidgetBody(props: RxRenderWidgetProps) {
        super.renderWidgetBody(props);

        let size = 0;
        if (!this.refCardContent.current) {
            setTimeout(() => this.forceUpdate(), 50);
        } else {
            size = this.refCardContent.current.offsetWidth;
            if (size > this.refCardContent.current.offsetHeight) {
                size = this.refCardContent.current.offsetHeight;
            }
        }

        const defaultRadiusSize = parseFloat(this.state.rxData.defaultRadiusSize as string) || 10;
        const defaultDistanceSize = parseFloat(this.state.rxData.defaultDistanceSize as string) || 18;
        const defaultFontSize = parseFloat(this.state.rxData.defaultFontSize as string) || 12;

        size -= defaultFontSize * 2; // let place for upper and bottom labels

        const homeRadius = (size * (parseFloat(this.state.rxData.homeCircleSize as string) || defaultRadiusSize)) / 100;
        // The per-circle font size wins over the default one. It used to be the other way round
        // (`defaultFontSize || <own>`), and since the default has a default of 12 the own field never had any
        // effect at all.
        const homeFontSize = parseFloat(this.state.rxData.homeFontSize as string) || defaultFontSize;
        const lineWidth = parseFloat(this.state.rxData.lineWidth as string) || 3;
        let homeIcon =
            this.state.rxData.homeStandardIcon || this.state.rxData.homeIcon || this.state.objects.home?.common?.icon;

        if (homeIcon?.startsWith('_PRJ_NAME/')) {
            homeIcon = homeIcon.replace(
                '_PRJ_NAME/',
                `${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${homeIcon.substring(9)}`,
            );
        }

        let maxRadius = 0;
        let valuesSum = 0;
        // prepare power line as first circle
        const valueAndUnit = this.getValue(this.state.rxData['powerLine-oid'], this.state.objects.powerLine);

        // add power line
        let circles: Circle[] = [
            {
                name: this.state.rxData.powerLineName,
                color:
                    valueAndUnit.iValue < 0
                        ? this.props.context.themeType === 'dark'
                            ? '#43d243'
                            : '#266e26'
                        : this.state.rxData.powerLineColor,
                radius:
                    (size * (parseFloat(this.state.rxData.powerLineCircleSize as string) || defaultRadiusSize)) / 100,
                distance:
                    (size * (parseFloat(this.state.rxData.powerLineDistanceSize as string) || defaultDistanceSize)) /
                    100,
                fontSize: parseFloat(this.state.rxData.powerLineFontSize as string) || defaultFontSize,
                oid: this.state.rxData['powerLine-oid'],
                unit: valueAndUnit.unit || this.getFallbackUnit(),
                value: valueAndUnit.value,
                iValue: valueAndUnit.iValue,
                icon:
                    this.state.rxData.powerLineStandardIcon ||
                    this.state.rxData.powerLineIcon ||
                    this.state.objects.powerLine?.common?.icon,
                arrow: valueAndUnit.iValue >= 0 ? '→' : '←', // '↦',
                secondaryValue: this.getValue(this.state.rxData['powerLineReturn-oid'], this.state.objects.powerLine),
                secondaryArrow: '←',
                iconSize: parseFloat(this.state.rxData.powerIconSize as string) || 33.3,
                hide:
                    this.state.objects.powerLine &&
                    this.state.objects.powerLine.hideIfLess !== null &&
                    this.state.objects.powerLine.hideIfLess !== undefined &&
                    valueAndUnit.iValue < this.state.objects.powerLine.hideIfLess,
                invert: this.state.objects.powerLine?.invert || false,
                speed: parseFloat((this.state.objects.powerLine?.speed as string) || '50') || 50,
                textColor: this.state.rxData.powerLineTextColor,
            },
        ];

        if (circles[0].radius > maxRadius) {
            maxRadius = circles[0].radius;
        }
        // The power line used to be counted into the sum only when its circle happened to be the biggest one,
        // which left the segments of the home ring out of proportion in every other case.
        valuesSum += Number.isFinite(valueAndUnit.iValue) ? Math.abs(valueAndUnit.iValue) : 0;

        // add all other nodes, like solar and so on
        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            const idx = `object${i}`;
            const _valueAndUnit = this.getValue(this.state.rxData[`oid${i}`], this.state.objects[idx]);
            const circle: Circle = {
                name: this.state.rxData[`name${i}`],
                color: this.state.rxData[`color${i}`],
                radius: (size * (parseFloat(this.state.rxData[`circleSize${i}`] as string) || defaultRadiusSize)) / 100,
                distance:
                    (size * (parseFloat(this.state.rxData[`distanceSize${i}`] as string) || defaultDistanceSize)) / 100,
                fontSize: parseFloat(this.state.rxData[`fontSize${i}`] as string) || defaultFontSize,
                oid: this.state.rxData[`oid${i}`],
                unit: _valueAndUnit.unit || this.getFallbackUnit(),
                value: _valueAndUnit.value,
                iValue: _valueAndUnit.iValue,
                icon:
                    this.state.rxData[`standardIcon${i}`] ||
                    this.state.rxData[`icon${i}`] ||
                    this.state.objects[`object${i}`]?.common?.icon,
                arrow: '',
                iconSize: parseFloat(this.state.rxData[`iconSize${i}`] as string) || 33.3,
                hide:
                    this.state.objects[idx] &&
                    this.state.objects[idx].hideIfLess != null &&
                    _valueAndUnit.iValue < this.state.objects[idx].hideIfLess,
                invert: (this.state.objects[idx] && this.state.objects[idx].invert) || false,
                speed: parseFloat((this.state.objects[idx]?.speed as string) || '50') || 50,
                textColor: this.state.rxData[`textColor${i}`],
                value2: this.state.rxData[`value2Oid${i}`]
                    ? this.state.values[`${this.state.rxData[`value2Oid${i}`]}.val`]
                    : undefined,
                value2Unit:
                    this.state.rxData[`value2Unit${i}`] || this.state.units[this.state.rxData[`value2Oid${i}`]] || '%',
            };
            circles.push(circle);

            if (circle.radius > maxRadius) {
                maxRadius = circle.radius;
            }
            valuesSum += Number.isFinite(_valueAndUnit.iValue) ? Math.abs(_valueAndUnit.iValue) : 0;
        }

        let currentPart = 0;
        const homeValueAndUnit = this.getValue(this.state.rxData['home-oid'], this.state.objects.home);
        let xOffset = 0;
        // calculate max and min position of circles to place it in the center
        const halfSize = size / 2;
        let max = halfSize;
        let min = halfSize;
        const allCoordinates: { top: number; left: number; leftLabel: number; topLabel?: number }[] = [];
        if (!this.props.editMode) {
            circles = circles.filter(circle => !circle.hide);
        }

        for (let i = 0; i < circles.length; i++) {
            const angle = 180 + (i * 360) / circles.length;
            const _coordinates = polarToCartesian(0, 0, circles[i].distance + circles[i].radius + homeRadius, angle);
            const position: { top: number; left: number; leftLabel: number; topLabel?: number } = {
                top: halfSize + _coordinates.y - circles[i].radius,
                left: halfSize + _coordinates.x - circles[i].radius,
                leftLabel: halfSize + _coordinates.x - circles[i].radius,
            };
            if (angle - 180 > 180) {
                position.topLabel = halfSize + _coordinates.y + circles[i].radius + 2;
            } else {
                position.topLabel = halfSize + _coordinates.y - circles[i].radius - 6 - circles[i].fontSize;
            }
            allCoordinates.push(position);
            if (max < position.left + circles[i].radius * 2) {
                max = position.left + circles[i].radius * 2;
            }
            if (min > position.left) {
                min = position.left;
            }
        }
        // compare with home
        if (max < halfSize + homeRadius) {
            max = halfSize + homeRadius;
        }
        if (min > halfSize - homeRadius) {
            min = halfSize - homeRadius;
        }
        // if (Math.abs(size - max - min) > 5) {
        xOffset = (size - max - min) / 2;
        // }
        const homeIconSize = parseFloat(this.state.rxData.homeIconSize as string) || 66.6;

        const content = (
            <div
                ref={this.refCardContent}
                style={styles.cardContent}
            >
                {size && (
                    <div style={{ position: 'relative' }}>
                        {/* show power line and others */}
                        {circles.map((circle, i) => {
                            const icon =
                                circle.icon && circle.icon.startsWith('_PRJ_NAME/')
                                    ? `${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${circle.icon.substring(9)}`
                                    : circle.icon;

                            return (
                                <div key={i}>
                                    <div
                                        className="vis-2-distribution-circle-value"
                                        style={{
                                            ...styles.circleContent,
                                            top: allCoordinates[i].top,
                                            left: xOffset + allCoordinates[i].left,
                                            width: circle.radius * 2,
                                            height: circle.radius * 2,
                                            fontSize: circle.fontSize,
                                            opacity: circle.hide ? 0.3 : 1,
                                        }}
                                    >
                                        {icon ? (
                                            <Icon
                                                src={icon}
                                                style={{
                                                    width: Math.round(circle.radius * (circle.iconSize / 100) * 2),
                                                    height: Math.round(circle.radius * (circle.iconSize / 100) * 2),
                                                }}
                                            />
                                        ) : null}
                                        {circle.secondaryValue?.value !== undefined ? (
                                            <div style={{ color: this.state.rxData.powerLineReturnColor }}>
                                                {`${circle.secondaryArrow}${circle.secondaryValue.value} ${circle.secondaryValue.unit || this.getFallbackUnit()}`}
                                            </div>
                                        ) : null}
                                        {circle.value !== undefined ? (
                                            <div>{`${circle.arrow}${circle.value} ${circle.unit}`}</div>
                                        ) : null}
                                        {circle.value2 !== undefined && circle.value2 !== null ? (
                                            <div>
                                                {`${circle.value2}${circle.value2Unit ? ` ${circle.value2Unit}` : ''}`}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div
                                        className={Utils.clsx(
                                            'vis-2-distribution-circle-text',
                                            `vis-2-distribution-circle-text-${i}`,
                                        )}
                                        style={{
                                            ...styles.circleContent,
                                            top: allCoordinates[i].topLabel,
                                            left: xOffset + allCoordinates[i].leftLabel,
                                            width: circle.radius * 2,
                                            fontSize: circle.fontSize,
                                            opacity: circle.hide ? 0.3 : 1,
                                            whiteSpace: 'nowrap',
                                            color: circle.textColor,
                                        }}
                                    >
                                        <div>{circle.name || circle.oid}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* show home icon and value in the middle of the circle */}
                        <div
                            style={{
                                ...styles.circleContent,
                                top: halfSize - homeRadius,
                                left: xOffset + halfSize - homeRadius,
                                width: homeRadius * 2,
                                height: homeRadius * 2,
                                fontSize: homeFontSize,
                            }}
                        >
                            {homeIcon ? (
                                <Icon
                                    src={homeIcon}
                                    style={{
                                        width: Math.round(homeRadius * (homeIconSize / 100) * 2),
                                        height: Math.round(homeRadius * (homeIconSize / 100) * 2),
                                    }}
                                />
                            ) : null}
                            {homeValueAndUnit.value !== undefined ? (
                                <div>{`${homeValueAndUnit.value} ${homeValueAndUnit.unit || this.getFallbackUnit()}`}</div>
                            ) : null}
                        </div>
                        {/* show home name at the bottom of the circle */}
                        <div
                            style={{
                                ...styles.circleContent,
                                top: halfSize + homeRadius,
                                left: xOffset + halfSize - homeRadius,
                                width: homeRadius * 2,
                                fontSize: homeFontSize,
                            }}
                        >
                            <div style={{ color: this.state.rxData.homeTextColor }}>
                                {this.state.rxData.homeName || this.state.rxData['home-oid'] || Generic.t('home')}
                            </div>
                        </div>
                        <svg style={{ width: size, height: size, overflow: 'visible' }}>
                            {valuesSum
                                ? circles.map((circle, i) => {
                                      // Show parts of home circle
                                      const partRadiusStroke =
                                          ((valuesSum -
                                              (Number.isFinite(circle.iValue) ? Math.abs(circle.iValue) : 0)) /
                                              valuesSum) *
                                          (Math.PI * (homeRadius * 2));
                                      const result = (
                                          <circle
                                              key={i}
                                              cx="50%"
                                              cy="50%"
                                              r={homeRadius}
                                              fill="none"
                                              stroke={
                                                  circle.color ||
                                                  this.state.rxData.homeColor ||
                                                  this.props.context.theme.palette.text.primary
                                              }
                                              style={{
                                                  strokeDashoffset: partRadiusStroke,
                                                  strokeDasharray: Math.PI * (homeRadius * 2),
                                                  transition: 'stroke-dashoffset 0.5s linear',
                                              }}
                                              transform={`translate(${xOffset}, 0), rotate(${Math.round((currentPart / valuesSum) * 360 + 135)},${halfSize},${halfSize})`}
                                              strokeWidth={lineWidth}
                                          />
                                      );
                                      currentPart += Number.isFinite(circle.iValue) ? Math.abs(circle.iValue) : 0;
                                      return result;
                                  })
                                : null}
                            {circles.map((circle, i) => {
                                // Show connection lines with moving circle
                                const angle = 180 + (i * 360) / circles.length;
                                const coordinates = polarToCartesian(
                                    0,
                                    0,
                                    circle.distance + circle.radius + homeRadius,
                                    angle,
                                );
                                const coordinatesFrom = polarToCartesian(0, 0, homeRadius, angle);
                                const coordinatesTo = polarToCartesian(0, 0, homeRadius + circle.distance, angle);
                                const motion = this.getMotion(circle, i);
                                const color =
                                    circle.color ||
                                    this.state.rxData.defaultColor ||
                                    this.props.context.theme.palette.text.primary;

                                // Absolute coordinates of both ends of the connection line. `animateMotion`
                                // translates the dot along this path, so the path is given in the coordinate
                                // system of the <svg> and not relative to the circle.
                                const homeEnd = `${xOffset + halfSize + coordinatesFrom.x} ${halfSize + coordinatesFrom.y}`;
                                const nodeEnd = `${xOffset + halfSize + coordinatesTo.x} ${halfSize + coordinatesTo.y}`;

                                return (
                                    <React.Fragment key={i}>
                                        <circle
                                            cx="50%"
                                            cy="50%"
                                            r={circle.radius}
                                            fill="none"
                                            opacity={circle.hide ? 0.3 : 1}
                                            stroke={color}
                                            strokeWidth={lineWidth}
                                            transform={`translate(${xOffset + coordinates.x}, ${coordinates.y})`}
                                        />
                                        <line
                                            x1={xOffset + halfSize + coordinatesFrom.x}
                                            y1={halfSize + coordinatesFrom.y}
                                            x2={xOffset + halfSize + coordinatesTo.x}
                                            y2={halfSize + coordinatesTo.y}
                                            stroke={color}
                                            opacity={circle.hide ? 0.3 : 1}
                                        />
                                        {motion ? (
                                            <circle
                                                cx={0}
                                                cy={0}
                                                r={motion.dotRadius}
                                                fill={color}
                                                stroke={color}
                                                strokeWidth={lineWidth}
                                                opacity={circle.hide ? 0.3 : 1}
                                                transform={
                                                    motion.animated
                                                        ? undefined
                                                        : `translate(${motion.toHome ? homeEnd.replace(' ', ', ') : nodeEnd.replace(' ', ', ')})`
                                                }
                                            >
                                                {/*
                                                    The dot used to be positioned by hand out of a state that
                                                    was bumped every 50 ms, which re-rendered the whole widget
                                                    20 times a second whether or not anything had changed. The
                                                    browser now animates it on its own and the widget only
                                                    re-renders when a value really changes.
                                                */}
                                                {motion.animated ? (
                                                    <animateMotion
                                                        dur={`${motion.duration}s`}
                                                        begin={`${motion.begin}s`}
                                                        repeatCount="indefinite"
                                                        path={
                                                            motion.toHome
                                                                ? `M ${nodeEnd} L ${homeEnd}`
                                                                : `M ${homeEnd} L ${nodeEnd}`
                                                        }
                                                    />
                                                ) : null}
                                            </circle>
                                        ) : null}
                                    </React.Fragment>
                                );
                            })}
                            {/* show home circle as last to overdraw all lines */}
                            <circle
                                cx="50%"
                                cy="50%"
                                r={homeRadius}
                                transform={`translate(${xOffset}, 0)`}
                                fill="none"
                                stroke={this.state.rxData.homeColor || this.props.context.theme.palette.text.primary}
                                strokeWidth={lineWidth}
                            />
                        </svg>
                    </div>
                )}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }

    getWidgetInfo() {
        return Distribution.getWidgetInfo();
    }
}

export default Distribution;
