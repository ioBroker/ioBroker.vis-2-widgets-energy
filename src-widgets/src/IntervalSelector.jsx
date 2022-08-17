import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import moment from 'moment';

import { I18n } from '@iobroker/adapter-react-v5';
import { Button, ButtonGroup, IconButton } from '@mui/material';
import { NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import Generic from './Generic';

const styles = () => ({
    nowButton: {
        marginRight: 20,
    },
});

class IntervalSelector extends Generic {
    constructor(props) {
        super(props);
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
                        name: 'timeStart-oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_time_start_oid',
                    },
                    {
                        name: 'timeInterval-oid',
                        type: 'id',
                        label: 'vis_2_widgets_energy_time_interval_oid',
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

        const end = this.props.timeStart || new Date().getTime();

        if (this.props.timeInterval === 'now') {
            periodName = moment(end).format('DD.MM.YYYY, hh:mm:ss');
        } else if (this.props.timeInterval === 'day') {
            periodName = moment(end).format('DD.MM.YYYY');
        } else if (this.props.timeInterval === 'week') {
            periodName = `${moment(new Date(end) - 7 * 24 * 60 * 60 * 1000).format('DD.MM.YYYY')} - ${moment(end).format('DD.MM.YYYY')}`;
        } else if (this.props.timeInterval === 'month') {
            periodName = `${moment(new Date(end) - 30 * 24 * 60 * 60 * 1000).format('DD.MM.YYYY')} - ${moment(end).format('DD.MM.YYYY')}`;
        } else if (this.props.timeInterval === 'year') {
            periodName = `${moment(new Date(end) - 365 * 24 * 60 * 60 * 1000).format('DD.MM.YYYY')} - ${moment(end).format('DD.MM.YYYY')}`;
        }
        const content = <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%',
        }}
        >
            {periodName}
            <IconButton onClick={() => {
                let newEnd = end;
                if (this.props.timeInterval === 'day') {
                    newEnd -= 24 * 60 * 60 * 1000;
                } else if (this.props.timeInterval === 'week') {
                    newEnd -= 7 * 24 * 60 * 60 * 1000;
                } else if (this.props.timeInterval === 'month') {
                    newEnd -= 30 * 24 * 60 * 60 * 1000;
                } else if (this.props.timeInterval === 'year') {
                    newEnd -= 365 * 24 * 60 * 60 * 1000;
                }
                this.props.setTimeStart(newEnd);
            }}
            >
                <NavigateBeforeIcon />
            </IconButton>
            <IconButton onClick={() => {
                let newEnd = end;
                if (this.props.timeInterval === 'day') {
                    newEnd += 24 * 60 * 60 * 1000;
                } else if (this.props.timeInterval === 'week') {
                    newEnd += 7 * 24 * 60 * 60 * 1000;
                } else if (this.props.timeInterval === 'month') {
                    newEnd += 30 * 24 * 60 * 60 * 1000;
                } else if (this.props.timeInterval === 'year') {
                    newEnd += 365 * 24 * 60 * 60 * 1000;
                }
                if (newEnd > new Date().getTime()) {
                    newEnd = null;
                }
                this.props.setTimeStart(newEnd);
            }}
            >

                <NavigateNextIcon />
            </IconButton>
            <Button
                variant="contained"
                color={this.props.timeInterval === 'now' ? 'primary' : 'grey'}
                onClick={() => this.props.setTimeInterval('now')}
                className={this.props.classes.nowButton}
            >
                {I18n.t('vis_2_widgets_energy_now')}
            </Button>
            <ButtonGroup>
                {['day', 'week', 'month', 'year'].map(period =>
                    <Button
                        key={period}
                        variant="contained"
                        color={period === this.props.timeInterval ? 'primary' : 'grey'}
                        onClick={() => {
                            if (period === this.props.timeInterval) {
                                return;
                            }
                            this.props.setTimeInterval(period);
                            this.props.setTimeStart(0);
                        }}
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
