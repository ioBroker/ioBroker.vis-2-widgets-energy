import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';

import { Icon } from '@iobroker/adapter-react-v5';

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
            visSetLabel: 'set_label', // Label of widget set
            visWidgetLabel: 'distribution',  // Label of widget
            visName: 'Distribution',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'name',
                            label: 'name',
                        },
                        {
                            name: 'defaultColor',
                            type: 'color',
                            label: 'default_color',
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
                            name: 'nodesCount',
                            type: 'number',
                            min: 0,
                            max: 10,
                            label: 'nodes_count',
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
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name]);
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
                        },
                        {
                            name: 'homeColor',
                            type: 'color',
                            label: 'home_color',
                        },
                        {
                            name: 'homeStandardIcon',
                            type: 'icon64',
                            label: 'standard_icon',
                            hidden: data => !!data.homeIcon,
                            default: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSA5LjNWNGgtM3YyLjZMMTIgM0wyIDEyaDN2OGg1di02aDR2Nmg1di04aDNsLTMtMi43em0tOSAuN2MwLTEuMS45LTIgMi0yczIgLjkgMiAyaC00eiIvPjwvc3ZnPg==',
                        },
                        {
                            name: 'homeIcon',
                            type: 'image',
                            hidden: data => !!data.homeStandardIcon,
                            label: 'custom_icon',
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
                            hidden: data => !data.homeIcon && !data.homeStandardIcon,
                        },
                        {
                            name: 'homeUnit',
                            label: 'units',
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
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'homeRound',
                            type: 'slider',
                            min: 0,
                            max: 6,
                            label: 'round',
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
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name]);
                                if (object && object.common) {
                                    data.powerLineColor = object.common.color !== undefined ? object.common.color : null;
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
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name]);
                                if (object && object.common) {
                                    data.powerLineColor = object.common.color !== undefined ? object.common.color : null;
                                    data.powerLineName = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                        },
                        {
                            name: 'powerLineName',
                            label: 'power_line_name',
                        },
                        {
                            name: 'powerLineColor',
                            type: 'color',
                            label: 'power_line_color',
                        },
                        {
                            name: 'powerLineReturnColor',
                            hidden: data => !data['powerLineReturn-oid'],
                            type: 'color',
                            label: 'power_line_return_color',
                            default: '#208020',
                        },
                        {
                            name: 'powerLineStandardIcon',
                            type: 'icon64',
                            label: 'standard_icon',
                            default: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NzAgNDcwIiB3aWR0aD0iNDcwIiBoZWlnaHQ9IjQ3MCI+DQogICAgPHBhdGgNCiAgICAgICAgZmlsbD0iY3VycmVudENvbG9yIg0KICAgICAgICBkPSJNNDIwLjYzNCwxNjkuNDIyYy0wLjAwMi0wLjAyNS0wLjAwMy0wLjA1LTAuMDA2LTAuMDc0Yy0wLjA3Ni0wLjcyNS0wLjI1NS0xLjQxNi0wLjUyMy0yLjA2NQ0KYy0wLjAxNS0wLjAzNy0wLjAyOS0wLjA3My0wLjA0NS0wLjEwOWMtMC4yNjktMC42MjMtMC42MTctMS4xOTgtMS4wMzctMS43MmMtMC4wNDctMC4wNTktMC4wOTUtMC4xMTctMC4xNDQtMC4xNzQNCmMtMC4yNTItMC4yOTUtMC41MjUtMC41Ny0wLjgyLTAuODIzYy0wLjA0NC0wLjAzOC0wLjA4NC0wLjA3OS0wLjEyOS0wLjExNmMtMC4xNDItMC4xMTYtMC4yOS0wLjIyMy0wLjQ0LTAuMzI5DQpjLTAuMTE2LTAuMDgyLTAuMjM0LTAuMTU4LTAuMzU1LTAuMjMzYy0wLjE4MS0wLjExMy0wLjM2NC0wLjIxOS0wLjU1NS0wLjMxNmMtMC4xOTgtMC4xMDItMC40LTAuMTk2LTAuNjA3LTAuMjc5DQpjLTAuMDYxLTAuMDI0LTAuMTE3LTAuMDU5LTAuMTc4LTAuMDgybC0xMjEuMTU0LTUyLjExNVY2OS4yMTFoMTExLjAyOHYzMS40OWMwLDQuMTQyLDMuMzU4LDcuNSw3LjUsNy41czcuNS0zLjM1OCw3LjUtNy41VjYyLjEwOA0KYzAuMDA3LTAuMTMyLDAuMDItMC4yNjMsMC4wMi0wLjM5N2MwLTAuMjQzLTAuMDMzLTAuNDc2LTAuMDU2LTAuNzEzYy0wLjAwMi0wLjAyNS0wLjAwMy0wLjA1LTAuMDA2LTAuMDc0DQpjLTAuMDc2LTAuNzI1LTAuMjU1LTEuNDE2LTAuNTIzLTIuMDY1Yy0wLjAxNS0wLjAzNy0wLjAyOS0wLjA3My0wLjA0NS0wLjEwOWMtMC4yNjktMC42MjMtMC42MTctMS4xOTgtMS4wMzctMS43Mg0KYy0wLjA0Ny0wLjA1OS0wLjA5NS0wLjExNy0wLjE0NC0wLjE3NGMtMC4yNTItMC4yOTUtMC41MjUtMC41Ny0wLjgyLTAuODIzYy0wLjA0NC0wLjAzOC0wLjA4NC0wLjA3OS0wLjEyOS0wLjExNg0KYy0wLjE0Mi0wLjExNi0wLjI5LTAuMjIzLTAuNDQtMC4zMjljLTAuMTE2LTAuMDgyLTAuMjM0LTAuMTU4LTAuMzU1LTAuMjMzYy0wLjE4MS0wLjExMy0wLjM2NC0wLjIxOS0wLjU1NS0wLjMxNg0KYy0wLjE5OC0wLjEwMi0wLjQtMC4xOTYtMC42MDctMC4yNzljLTAuMDYxLTAuMDI0LTAuMTE3LTAuMDU5LTAuMTc4LTAuMDgyTDI5MC4xMDcsMC42MUMyODkuMTk1LDAuMjE5LDI4OC4xOTUsMCwyODcuMTQzLDBIMTgyLjgzNw0KYy0xLjA1MiwwLTIuMDUyLDAuMjE5LTIuOTYxLDAuNjA5QzE3OS44NzMsMC42MSw1My45Miw1NC43OSw1My45Miw1NC43OWMtMC4wMjMsMC4wMS0wLjA0NiwwLjAyLTAuMDY5LDAuMDMNCmMtMC4wODMsMC4wMzYtMC4xNTYsMC4wNzYtMC4yMzIsMC4xMTJjLTAuMTk4LDAuMDk0LTAuMzkxLDAuMTk0LTAuNTgsMC4zMDRjLTAuMTMxLDAuMDc2LTAuMjYyLDAuMTUyLTAuMzg3LDAuMjM1DQpjLTAuMDY1LDAuMDQzLTAuMTI1LDAuMDkxLTAuMTg5LDAuMTM2Yy0wLjEyNywwLjA5LTAuMjUyLDAuMTgxLTAuMzcyLDAuMjc4Yy0wLjA2LDAuMDQ5LTAuMTE4LDAuMTAxLTAuMTc3LDAuMTUyDQpjLTAuMTE2LDAuMS0wLjIyOSwwLjIwMS0wLjMzOCwwLjMwOGMtMC4wNTksMC4wNTctMC4xMTUsMC4xMTYtMC4xNzEsMC4xNzVjLTAuMTAxLDAuMTA1LTAuMTk5LDAuMjEyLTAuMjkzLDAuMzIzDQpjLTAuMDU4LDAuMDY3LTAuMTE0LDAuMTM2LTAuMTY5LDAuMjA1Yy0wLjA4NSwwLjEwNy0wLjE2NiwwLjIxNi0wLjI0NSwwLjMyN2MtMC4wNTYsMC4wNzgtMC4xMTEsMC4xNTYtMC4xNjQsMC4yMzYNCmMtMC4wNywwLjEwOC0wLjEzNSwwLjIxOS0wLjIsMC4zMjljLTAuMDUxLDAuMDg4LTAuMTA0LDAuMTc0LTAuMTUyLDAuMjY0Yy0wLjA2MSwwLjExNi0wLjExNSwwLjIzNS0wLjE3MSwwLjM1NA0KYy0wLjA2MSwwLjEzMi0wLjEyLDAuMjY1LTAuMTc0LDAuNGMtMC4wNjIsMC4xNTYtMC4xMjIsMC4zMTItMC4xNzMsMC40NzJjLTAuMDI5LDAuMDkxLTAuMDUyLDAuMTg1LTAuMDc3LDAuMjc4DQpjLTAuMDM3LDAuMTMyLTAuMDczLDAuMjY1LTAuMTAzLDAuMzk5Yy0wLjAyLDAuMDkxLTAuMDM1LDAuMTgzLTAuMDUyLDAuMjc1Yy0wLjAyNiwwLjE0NS0wLjA0OSwwLjI5LTAuMDY3LDAuNDM3DQpjLTAuMDEsMC4wODUtMC4wMTksMC4xNy0wLjAyNiwwLjI1NmMtMC4wMTQsMC4xNjItMC4wMjEsMC4zMjQtMC4wMjUsMC40ODdjLTAuMDAxLDAuMDUxLTAuMDA4LDAuMS0wLjAwOCwwLjE1djM4Ljk5DQpjMCw0LjE0MiwzLjM1OCw3LjUsNy41LDcuNXM3LjUtMy4zNTgsNy41LTcuNXYtMzEuNDloMTExLjAyOHY0MS43NzNMNTMuOTIsMTYzLjIxMmMtMC4wMjMsMC4wMS0wLjA0NiwwLjAyLTAuMDY5LDAuMDMNCmMtMC4wODMsMC4wMzYtMC4xNTYsMC4wNzYtMC4yMzIsMC4xMTJjLTAuMTk4LDAuMDk0LTAuMzkxLDAuMTk0LTAuNTgsMC4zMDRjLTAuMTMxLDAuMDc2LTAuMjYyLDAuMTUyLTAuMzg3LDAuMjM1DQpjLTAuMDY1LDAuMDQzLTAuMTI1LDAuMDkxLTAuMTg5LDAuMTM2Yy0wLjEyNywwLjA5LTAuMjUyLDAuMTgxLTAuMzcyLDAuMjc4Yy0wLjA2LDAuMDQ5LTAuMTE4LDAuMTAxLTAuMTc3LDAuMTUyDQpjLTAuMTE2LDAuMS0wLjIyOSwwLjIwMS0wLjMzOCwwLjMwOGMtMC4wNTksMC4wNTctMC4xMTUsMC4xMTYtMC4xNzEsMC4xNzVjLTAuMTAxLDAuMTA1LTAuMTk5LDAuMjEyLTAuMjkzLDAuMzIzDQpjLTAuMDU4LDAuMDY3LTAuMTE0LDAuMTM2LTAuMTY5LDAuMjA1Yy0wLjA4NSwwLjEwNy0wLjE2NiwwLjIxNi0wLjI0NSwwLjMyN2MtMC4wNTYsMC4wNzgtMC4xMTEsMC4xNTYtMC4xNjQsMC4yMzYNCmMtMC4wNywwLjEwOC0wLjEzNSwwLjIxOS0wLjIsMC4zMjljLTAuMDUxLDAuMDg4LTAuMTA0LDAuMTc0LTAuMTUyLDAuMjY0Yy0wLjA2MSwwLjExNi0wLjExNSwwLjIzNS0wLjE3MSwwLjM1NA0KYy0wLjA2MSwwLjEzMi0wLjEyLDAuMjY1LTAuMTc0LDAuNGMtMC4wNjIsMC4xNTYtMC4xMjIsMC4zMTItMC4xNzMsMC40NzJjLTAuMDI5LDAuMDkxLTAuMDUyLDAuMTg1LTAuMDc3LDAuMjc4DQpjLTAuMDM3LDAuMTMyLTAuMDczLDAuMjY1LTAuMTAzLDAuMzk5Yy0wLjAyLDAuMDkxLTAuMDM1LDAuMTgzLTAuMDUyLDAuMjc1Yy0wLjAyNiwwLjE0NS0wLjA0OSwwLjI5LTAuMDY3LDAuNDM3DQpjLTAuMDEsMC4wODUtMC4wMTksMC4xNy0wLjAyNiwwLjI1NmMtMC4wMTQsMC4xNjItMC4wMjEsMC4zMjQtMC4wMjUsMC40ODdjLTAuMDAxLDAuMDUxLTAuMDA4LDAuMS0wLjAwOCwwLjE1djM4Ljk5DQpjMCw0LjE0MiwzLjM1OCw3LjUsNy41LDcuNXM3LjUtMy4zNTgsNy41LTcuNXYtMzEuNDloMTA4LjMxN0w4NC4wMjMsNDYwLjI1NmMtMC4wMDgsMC4wMjYtMC4wMSwwLjA1My0wLjAxOCwwLjA3OQ0KYy0wLjEwNywwLjM1Ny0wLjE5LDAuNzIxLTAuMjQzLDEuMDg4Yy0wLjAwNCwwLjAyOC0wLjAxMSwwLjA1NS0wLjAxNSwwLjA4M2MtMC4wNDgsMC4zNTktMC4wNjIsMC43MjEtMC4wNTgsMS4wODMNCmMwLjAwMSwwLjA3MiwwLDAuMTQzLDAuMDAzLDAuMjE1YzAuMDE0LDAuMzUxLDAuMDUzLDAuNywwLjExNiwxLjA0N2MwLjAxMSwwLjA2LDAuMDI1LDAuMTE4LDAuMDM3LDAuMTc4DQpjMC4xNDgsMC43MTUsMC40MDMsMS40MTIsMC43NjMsMi4wN2MwLjAyOCwwLjA1MSwwLjA1NCwwLjEwMSwwLjA4MywwLjE1MWMwLjE3OCwwLjMwNywwLjM3OCwwLjYwNCwwLjYwMywwLjg5DQpjMC4wNDIsMC4wNTMsMC4wODgsMC4xMDMsMC4xMzEsMC4xNTVjMC4wOTIsMC4xMTEsMC4xOCwwLjIyNCwwLjI3OSwwLjMzYzAuMTI2LDAuMTM1LDAuMjYyLDAuMjU3LDAuMzk2LDAuMzgNCmMwLjA0MSwwLjAzOCwwLjA3OCwwLjA3OCwwLjEyLDAuMTE1YzAuMjg1LDAuMjUyLDAuNTg3LDAuNDc1LDAuODk5LDAuNjc2YzAuMDI1LDAuMDE2LDAuMDQ1LDAuMDM3LDAuMDcsMC4wNTMNCmMwLjAzNCwwLjAyMSwwLjA3LDAuMDM1LDAuMTA0LDAuMDU1YzAuMjQ4LDAuMTUsMC41MDEsMC4yODcsMC43NjEsMC40MDZjMC4wMzgsMC4wMTgsMC4wNzUsMC4wMzksMC4xMTQsMC4wNTYNCmMwLjI5NCwwLjEyOCwwLjU5MywwLjIzNiwwLjg5OCwwLjMyNmMwLjA2OSwwLjAyLDAuMTM5LDAuMDM1LDAuMjA5LDAuMDUzYzAuMjM3LDAuMDYyLDAuNDc3LDAuMTEzLDAuNzE4LDAuMTUxDQpjMC4wODgsMC4wMTQsMC4xNzYsMC4wMjksMC4yNjQsMC4wNGMwLjMwMiwwLjAzNywwLjYwNiwwLjA2MywwLjkxMSwwLjA2M2MxLjYyMSwwLDMuMjMzLTAuNTE0LDQuNTgxLTEuNTUyDQpjMC4xOTEtMC4xNDcsMC4zNzYtMC4zMDQsMC41NTUtMC40NzFsMjEzLjY2My0xOTkuOTYzbDUzLjE1MSwxNjkuNTM5bC0xMDEuMDU2LTk0LjU3NmMtMy4wMjUtMi44My03Ljc3MS0yLjY3My0xMC42MDEsMC4zNTENCnMtMi42NzMsNy43NzEsMC4zNTEsMTAuNjAxbDEyMS44NjIsMTE0LjA0N2MxLjQyOCwxLjMzNiwzLjI3MSwyLjAyNCw1LjEyNywyLjAyNGMxLjM3NywwLDIuNzYxLTAuMzc4LDMuOTg5LTEuMTUNCmMyLjg4NC0xLjgxMyw0LjE4NS01LjM0MiwzLjE2Ni04LjU5M2wtODguNjAyLTI4Mi42MjJoMTA4LjMxN3YzMS40OWMwLDQuMTQyLDMuMzU4LDcuNSw3LjUsNy41czcuNS0zLjM1OCw3LjUtNy41di0zOC41OTQNCmMwLjAwNy0wLjEzMiwwLjAyLTAuMjYzLDAuMDItMC4zOTdDNDIwLjY5MSwxNjkuODkyLDQyMC42NTgsMTY5LjY1OCw0MjAuNjM1LDE2OS40MjF6IE0xOTAuMzM3LDE2Mi42MzR2LTM5LjIxMWg4OS4zMDd2MzkuMjExDQpIMTkwLjMzN3ogTTI5NC42NDMsNTQuMjExVjE4Ljg5MWw4Mi4xMTIsMzUuMzIxSDI5NC42NDN6IE0xOTAuMzM3LDE1aDg5LjMwN3YzOS4yMTFoLTg5LjMwN1YxNXogTTkzLjIyNSw1NC4yMTFsODIuMTEyLTM1LjMyMQ0KdjM1LjMyMUg5My4yMjV6IE0yNzkuNjQzLDY5LjIxMXYzOS4yMTFoLTg5LjMwN1Y2OS4yMTFIMjc5LjY0M3ogTTE3NS4zMzcsMTI3LjMxM3YzNS4zMjFIOTMuMjI1TDE3NS4zMzcsMTI3LjMxM3ogTTE2MC4wMTIsMjY4LjAxMw0KbDY0LjAwMiw1OS44OThsLTExNy4xNTIsMTA5LjY0TDE2MC4wMTIsMjY4LjAxM3ogTTMwNC45ODksMjUyLjEyOWwtNjkuOTk5LDY1LjUxbC02OS45OTgtNjUuNTFsMjMuMzU0LTc0LjQ5NWg5My4yODkNCkwzMDQuOTg5LDI1Mi4xMjl6IE0yOTQuNjQzLDE2Mi42MzR2LTM1LjMyMWw4Mi4xMTIsMzUuMzIySDI5NC42NDR6Ig0KICAgIC8+DQo8L3N2Zz4=',
                            hidden: data => !!data.powerLineIcon,
                        },
                        {
                            name: 'powerLineIcon',
                            hidden: data => !!data.powerLineStandardIcon,
                            type: 'image',
                            label: 'custom_icon',
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
                            hidden: data => !data.powerLineIcon && !data.powerLineStandardIcon,
                            min: 0,
                            max: 230,
                        },
                        {
                            name: 'powerUnit',
                            label: 'units',
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
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'powerRound',
                            type: 'slider',
                            min: 0,
                            max: 6,
                            label: 'round',
                            default: 2,
                        },
                        {
                            name: 'powerHideIfLess',
                            type: 'number',
                            label: 'hide_if_less',
                        },
                        {
                            name: 'powerInvert',
                            type: 'checkbox',
                            label: 'invert_direction',
                        },
                        {
                            name: 'powerSpeed',
                            type: 'slider',
                            min: 2,
                            max: 50,
                            default: 50,
                            label: 'motion_speed',
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
                            onChange: async (field, data, changeData, socket) => {
                                const object = await socket.getObject(data[field.name]);
                                if (object && object.common) {
                                    data[`color${field.index}`] = object.common.color !== undefined ? object.common.color : null;
                                    data[`name${field.index}`] = Generic.getText(object.common.name);
                                    changeData(data);
                                }
                            },
                            noInit: true,
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
                            name: 'standardIcon',
                            type: 'icon64',
                            label: 'standard_icon',
                            hidden: (data, index) => !!data[`icon${index}`],
                            default: '',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            hidden: (data, index) => !!data[`standardIcon${index}`],
                            label: 'custom_icon',
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
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'round',
                            type: 'slider',
                            min: 0,
                            max: 6,
                            label: 'round',
                            default: 2,
                        },
                        {
                            name: 'hideIfLess',
                            type: 'number',
                            label: 'hide_if_less',
                        },
                        {
                            name: 'invert',
                            type: 'checkbox',
                            label: 'invert_direction',
                        },
                        {
                            name: 'speed',
                            type: 'slider',
                            min: 2,
                            max: 50,
                            default: 50,
                            label: 'motion_speed',
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
            const object = await this.props.context.socket.getObject(oid);
            if (!object) {
                return { common: {} };
            }
            object.common = object.common || {};
            if (!iconExists && !object.common.icon && (object.type === 'state' || object.type === 'channel')) {
                const idArray = oid.split('.');

                // read channel
                const parentObject = await this.props.context.socket.getObject(idArray.slice(0, -1).join('.'));
                if (!parentObject?.common?.icon && (object.type === 'state' || object.type === 'channel')) {
                    const grandParentObject = await this.props.context.socket.getObject(idArray.slice(0, -2).join('.'));
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
            const idx = `object${i}`;
            objects[idx] = await this.loadObject(this.state.rxData[`oid${i}`], this.state.rxData[`icon${i}`]);
            if (this.state.rxData[`unit${i}`]) {
                objects[idx].common.unit = this.state.rxData[`unit${i}`];
            }
            objects[idx].factor = parseFloat(this.state.rxData[`factor${i}`]) || 1;

            let n = this.state.rxData[`round${i}`];
            objects[idx].round = n === undefined || n === null || n === '' ? 2 : (parseFloat(n) || 0);

            n = this.state.rxData[`speed${i}`];
            objects[idx].speed = n === undefined || n === null || n === '' ? 50 : (parseFloat(n) || 50);

            n = this.state.rxData[`hideIfLess${i}`];
            objects[idx].hideIfLess = n === undefined || n === null || n === '' ? null : (parseFloat(n) || 0);

            n = this.state.rxData[`invert${i}`];
            objects[idx].invert = n === true || n === 'true';

            units[this.state.rxData[`oid${i}`]] = objects[idx].common.unit;
        }
        // home
        objects.home = await this.loadObject(this.state.rxData['home-oid'], this.state.rxData.homeIcon);
        if (this.state.rxData.homeUnit) {
            objects.home.common.unit = this.state.rxData.homeUnit;
        }
        objects.home.factor = parseFloat(this.state.rxData.homeFactor) || 1;
        let n = this.state.rxData.homeRound;
        objects.home.round = n === undefined || n === null || n === '' ? 2 : (parseFloat(n) || 0);

        objects.home.hideIfLess = null;

        // power line
        objects.powerLine = await this.loadObject(this.state.rxData['powerLine-oid'], this.state.rxData.powerLineIcon);
        if (this.state.rxData.powerUnit) {
            objects.powerLine.common.unit = this.state.rxData.powerUnit;
        }
        objects.powerLine.factor = parseFloat(this.state.rxData.powerFactor) || 1;

        n = this.state.rxData.powerInvert;
        objects.powerLine.invert = n === true || n === 'true';

        n = this.state.rxData.powerRound;
        objects.powerLine.round = n === undefined || n === null || n === '' ? 2 : (parseFloat(n) || 0);

        n = this.state.rxData.powerSpeed;
        objects.powerLine.speed = n === undefined || n === null || n === '' ? 50 : (parseFloat(n) || 50);

        n = this.state.rxData.powerHideIfLess;
        objects.powerLine.hideIfLess = n === undefined || n === null || n === '' ? null : (parseFloat(n) || 0);

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

    onRxDataChanged() {
        this.propertiesUpdate();
    }

    getValue(oid, obj) {
        let value;
        if (oid) {
            value = this.state.values[`${oid}.val`];
            if (value === null || value === undefined) {
                value = '--';
            } else {
                // string => float
                value = parseFloat(value.toString().replace(',', '.')) || 0;
                if (this.state.units[oid] === 'Wh') {
                    value = Math.round(value / 10) / 100;
                }
                if (obj && obj.factor !== 1) {
                    value *= obj.factor;
                }
                value = this.formatValue(value, obj?.round === undefined ? 2 : obj.round);
            }
            return {
                unit: this.state.units[oid],
                value,
                iValue: parseFloat(value.toString().replace(',', '.')) || 0,
            };
        }
        return {
            unit: this.state.units[oid],
            value: undefined,
            iValue: 0,
        };
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
            homeIcon = homeIcon.replace('_PRJ_NAME/', `${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${homeIcon.substring(9)}`);
        }

        let maxRadius = 0;
        let valuesSum = 0;
        // prepare power line as first circle
        const valueAndUnit = this.getValue(this.state.rxData['powerLine-oid'], this.state.objects.powerLine);

        let circles = [{
            name: this.state.rxData.powerLineName,
            color: this.state.rxData.powerLineColor,
            radius: (size * (this.state.rxData.powerLineCircleSize || defaultRadiusSize)) / 100,
            distance: (size * (this.state.rxData.powerLineDistanceSize || defaultDistanceSize)) / 100,
            fontSize: defaultFontSize || this.state.rxData.powerLineFontSize,
            oid: this.state.rxData['powerLine-oid'],
            unit: valueAndUnit.unit || Generic.t('kwh'),
            value: valueAndUnit.value,
            iValue: valueAndUnit.iValue,
            icon: this.state.rxData.powerLineStandardIcon || this.state.rxData.powerLineIcon || this.state.objects.powerLine?.common?.icon,
            arrow: '→', // '↦',
            secondaryValue: this.getValue(this.state.rxData['powerLineReturn-oid'], this.state.objects.powerLine),
            secondaryArrow: '←',
            iconSize: parseFloat(this.state.rxData.powerIconSize) || 33.3,
            hide: this.state.objects.powerLine &&
                this.state.objects.powerLine.hideIfLess !== null &&
                valueAndUnit.iValue < this.state.objects.powerLine.hideIfLess,
            invert: this.state.objects.powerLine?.invert || false,
            speed: parseFloat(this.state.objects.powerLine?.speed) || 50,
        }];

        if (circles[0].radius > maxRadius) {
            maxRadius = circles[0].radius;
            valuesSum += Number.isFinite(valueAndUnit.iValue) ? Math.abs(valueAndUnit.iValue) : 0;
        }

        // add all other nodes, like solar and so on
        for (let i = 1; i <= this.state.rxData.nodesCount; i++) {
            const idx = `object${i}`;
            const _valueAndUnit = this.getValue(this.state.rxData[`oid${i}`], this.state.objects[idx]);
            const circle = {
                name: this.state.rxData[`name${i}`],
                color: this.state.rxData[`color${i}`],
                radius: (size * (this.state.rxData[`circleSize${i}`] || defaultRadiusSize)) / 100,
                distance: (size * (this.state.rxData[`distanceSize${i}`] || defaultDistanceSize)) / 100,
                fontSize: defaultFontSize || this.state.rxData[`fontSize${i}`],
                oid: this.state.rxData[`oid${i}`],
                unit: _valueAndUnit.unit || Generic.t('kwh'),
                value: _valueAndUnit.value,
                iValue: _valueAndUnit.iValue,
                icon: this.state.rxData[`standardIcon${i}`] || this.state.rxData[`icon${i}`] || this.state.objects[`object${i}`]?.common?.icon,
                arrow: '',
                iconSize: parseFloat(this.state.rxData[`iconSize${i}`]) || 33.3,
                hide: this.state.objects[idx] &&
                    this.state.objects[idx].hideIfLess !== null &&
                    _valueAndUnit.iValue < this.state.objects[idx].hideIfLess,
                invert: (this.state.objects[idx] && this.state.objects[idx].invert) || false,
                speed: parseFloat(this.state.objects[idx] && this.state.objects[idx].speed) || 50,
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
        let max = size / 2;
        let min = size / 2;
        const allCoordinates = [];
        if (!this.props.editMode) {
            circles = circles.filter(circle => !circle.hide);
        }

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
        const homeIconSize = parseFloat(this.state.rxData.homeIconSize) || 66.6;

        const content = <div
            ref={this.refCardContent}
            className={this.props.classes.cardContent}
        >
            {size && <div style={{ position: 'relative' }}>
                {/* show power line and others */}
                {circles.map((circle, i) => {
                    const icon = circle.icon && circle.icon.startsWith('_PRJ_NAME/') ?
                        `${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${circle.icon.substring(9)}`
                        :
                        circle.icon;

                    return <div key={i}>
                        <div
                            className={this.props.classes.circleContent}
                            style={{
                                top:      allCoordinates[i].top,
                                left:     xOffset + allCoordinates[i].left,
                                width:    circle.radius * 2,
                                height:   circle.radius * 2,
                                fontSize: circle.fontSize,
                                opacity:  circle.hide ? 0.3 : 1,
                            }}
                        >
                            {icon ?
                                <Icon src={icon} style={{ width: Math.round(circle.radius * (circle.iconSize / 100) * 2), height: Math.round(circle.radius * (circle.iconSize / 100) * 2) }} />
                                : null}
                            {circle.secondaryValue?.value !== undefined ? <div style={{ color: this.state.rxData.powerLineReturnColor }}>
                                {`${circle.secondaryArrow}${circle.secondaryValue.value} ${circle.secondaryValue.unit || Generic.t('kwh')}`}
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
                                opacity:  circle.hide ? 0.3 : 1,
                            }}
                        >
                            <div>{circle.name || circle.oid}</div>
                        </div>
                    </div>;
                })}
                {/* show home icon and value in the middle of the circle */}
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
                    {homeIcon ?
                        <Icon src={homeIcon} style={{ width: Math.round(homeRadius * (homeIconSize / 100) * 2), height: Math.round(homeRadius * (homeIconSize / 100) * 2) }} />
                        : null}
                    {homeValueAndUnit.value !== undefined ? <div>
                        {`${homeValueAndUnit.value} ${homeValueAndUnit.unit || Generic.t('kwh')}`}
                    </div> : null}
                </div>
                {/* show home name at the bottom of the circle */}
                <div
                    className={this.props.classes.circleContent}
                    style={{
                        top: size / 2 + homeRadius,
                        left: xOffset + size / 2 - homeRadius,
                        width: homeRadius * 2,
                        fontSize: homeFontSize,
                    }}
                >
                    <div>{this.state.rxData.homeName || this.state.rxData['home-oid'] || Generic.t('home')}</div>
                </div>
                <svg style={{ width: size, height: size, overflow: 'visible' }}>
                    {valuesSum ? circles.map((circle, i) => {
                        // Show parts of home circle
                        const partRadiusStroke = ((valuesSum - (Number.isFinite(circle.iValue) ? Math.abs(circle.iValue) : 0)) / valuesSum) * (Math.PI * (homeRadius * 2));
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
                        currentPart += Number.isFinite(circle.iValue) ? Math.abs(circle.iValue) : 0;
                        return result;
                    }) : null}
                    {circles.map((circle, i) => {
                        // Show connection lines with moving circle
                        const angle           = 180 + (i * 360) / circles.length;
                        const coordinates     = polarToCartesian(0, 0, circle.distance + circle.radius + homeRadius, angle);
                        const coordinatesFrom = polarToCartesian(0, 0, homeRadius, angle);
                        const coordinatesTo   = polarToCartesian(0, 0, homeRadius + circle.distance, angle);
                        let step = Number.isFinite(circle.iValue) ? Math.abs(circle.iValue) / circle.speed : 0;
                        if (step > 2) {
                            step = 2;
                        }
                        let offset = (this.state.offset * step + i * 10) % circle.distance;
                        if (circle.invert) {
                            if (circle.iValue < 0) {
                                offset = circle.distance - offset;
                            }
                        } else if (circle.iValue > 0) {
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
                                opacity={circle.hide ? 0.3 : 1}
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
                                opacity={circle.hide ? 0.3 : 1}
                            />
                            {circle.iValue ? <circle
                                cx="50%"
                                cy="50%"
                                r={step < 0.5 ? 1.5 : step * 3}
                                fill={color}
                                stroke={color}
                                strokeWidth="3"
                                opacity={circle.hide ? 0.3 : 1}
                                transform={`translate(${xOffset + coordinatesOffset.x}, ${coordinatesOffset.y})`}
                            /> : null}
                        </React.Fragment>;
                    })}
                    {/* show home circle as last to overdraw all lines */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r={homeRadius}
                        transform={`translate(${xOffset}, 0)`}
                        fill="none"
                        stroke={this.state.rxData.homeColor || this.props.theme.palette.text.primary}
                        strokeWidth="3"
                    />
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
