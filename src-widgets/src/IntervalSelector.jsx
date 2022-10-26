import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from '@mui/styles';
import moment from 'moment';

import { Button, ButtonGroup, IconButton } from '@mui/material';
import { NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import Generic from './Generic';
import { getFromToTime } from './Utils';

const styles = () => ({
    nowButton: {
        marginRight: 20,
    },
    contentContainer: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%',
    },
    content: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
    },
    periodName: {
        flexShrink: 0,
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
            visWidgetLabel: 'interval_selector',  // Label of widget
            visName: 'Interval selector',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'name',
                        label: 'name',
                    },
                    {
                        name: 'timeStart-oid',
                        type: 'id',
                        label: 'time_start_oid',
                    },
                    {
                        name: 'timeInterval-oid',
                        type: 'id',
                        label: 'time_interval_oid',
                    },
                ],
            }],
            visDefaultStyle: {
                width: 320,
                height: 60,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_interval_selector.png',
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

    onRxDataChanged() {
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return IntervalSelector.getWidgetInfo();
    }

    getTimeStart() {
        return this.state.rxData['timeStart-oid'] ?
            this.state.values[`${this.state.rxData['timeStart-oid']}.val`] :
            this.props.timeStart;
    }

    setTimeStart = timeStart => {
        if (this.state.rxData['timeStart-oid']) {
            this.props.socket.setState(this.state.rxData['timeStart-oid'], timeStart);
        } else {
            this.props.setTimeStart(timeStart);
        }
    };

    getTimeInterval() {
        return this.state.rxData['timeInterval-oid'] ?
            this.state.values[`${this.state.rxData['timeInterval-oid']}.val`] :
            this.props.timeInterval;
    }

    setTimeInterval = timeInterval => {
        if (this.state.rxData['timeInterval-oid']) {
            this.props.socket.setState(this.state.rxData['timeInterval-oid'], timeInterval);
        } else {
            this.props.setTimeInterval(timeInterval);
        }
    };

    renderWidgetBody(props) {
        super.renderWidgetBody(props);

        let periodName = '';

        const interval = getFromToTime(this.getTimeStart(), this.getTimeInterval());

        if (this.getTimeInterval() === 'day') {
            periodName = moment(interval.from).format('DD.MM.YYYY');
        } else if (this.getTimeInterval() === 'week') {
            periodName = <>
                {moment(new Date(interval.from)).format('DD.MM')}
                {' '}
                &mdash;
                {' '}
                {moment(interval.to).format('DD.MM')}
            </>;
        } else if (this.getTimeInterval() === 'month') {
            periodName = moment(new Date(interval.from)).format('MM.YYYY');
        } else if (this.getTimeInterval() === 'year') {
            periodName = moment(new Date(interval.from)).format('YYYY');
        }
        const content = <div className={this.props.classes.contentContainer}>
            <div className={this.props.classes.content}>
                <span className={this.props.classes.periodName}>{periodName}</span>
                <IconButton onClick={() => {
                    const newEnd = new Date(interval.from);
                    if (this.getTimeInterval() === 'day') {
                        newEnd.setDate(newEnd.getDate() - 1);
                    } else if (this.getTimeInterval() === 'week') {
                        newEnd.setDate(newEnd.getDate() - 7);
                    } else if (this.getTimeInterval() === 'month') {
                        newEnd.setMonth(newEnd.getMonth() - 1);
                    } else if (this.getTimeInterval() === 'year') {
                        newEnd.setFullYear(newEnd.getFullYear() - 1);
                    }
                    this.setTimeStart(newEnd.getTime());
                }}
                >
                    <NavigateBeforeIcon />
                </IconButton>
                <IconButton
                    disabled={!this.getTimeStart()}
                    onClick={() => {
                        const newEnd = new Date(interval.from);
                        if (this.getTimeInterval() === 'day') {
                            newEnd.setDate(newEnd.getDate() + 1);
                        } else if (this.getTimeInterval() === 'week') {
                            newEnd.setDate(newEnd.getDate() + 7);
                        } else if (this.getTimeInterval() === 'month') {
                            newEnd.setMonth(newEnd.getMonth() + 1);
                        } else if (this.getTimeInterval() === 'year') {
                            newEnd.setFullYear(newEnd.getFullYear() + 1);
                        }
                        this.setTimeStart(
                            getFromToTime(newEnd, this.getTimeInterval()).from.getTime() >= getFromToTime(null, this.getTimeInterval()).from.getTime()
                                ? null
                                : newEnd.getTime(),
                        );
                    }}
                >

                    <NavigateNextIcon />
                </IconButton>
                <Button
                    variant="contained"
                    color="grey"
                    disabled={!this.getTimeStart()}
                    onClick={() => this.setTimeStart(0)}
                    className={this.props.classes.nowButton}
                >
                    {Generic.t('now')}
                </Button>
                <ButtonGroup>
                    {['day', 'week', 'month', 'year'].map(period =>
                        <Button
                            key={period}
                            variant="contained"
                            color={period === this.getTimeInterval() ? 'primary' : 'grey'}
                            onClick={() => {
                                if (period === this.getTimeInterval()) {
                                    return;
                                }
                                this.setTimeInterval(period);
                                this.setTimeStart(0);
                            }}
                        >
                            {Generic.t(`${period}`)}
                        </Button>)}
                </ButtonGroup>
            </div>
        </div>;

        return this.wrapContent(content, null, { textAlign: 'center', padding: 0 });
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
