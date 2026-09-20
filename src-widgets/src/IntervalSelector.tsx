import React from 'react';

import { Button, ButtonGroup, IconButton, Tooltip } from '@mui/material';
import { NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxData, VisRxWidgetState } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { getFromToTime, type TimeIntervalType } from './Utils';
import type { TimeSelectorEventHandler, TimeSelectorNode } from './TimeWidget';

/** Re-exported for widget sets that imported the type from here before it moved to `TimeWidget.ts` */
export type { TimeSelectorNode as HTMLDiv } from './TimeWidget';

/** All periods, in the order they are shown */
const ALL_PERIODS: TimeIntervalType[] = ['day', 'week', 'month', 'year'];

const styles: Record<string, React.CSSProperties> = {
    nowButton: {
        marginRight: 20,
    },
    contentContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    content: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    periodName: {
        flexShrink: 0,
    },
};

interface IntervalSelectorRxData extends VisRxData {
    noCard: boolean;
    widgetTitle: string;
    'timeStart-oid': string;
    'timeInterval-oid': string;
    showDay: boolean;
    showWeek: boolean;
    showMonth: boolean;
    showYear: boolean;
    hideNow: boolean;
    dateFormat: 'dmy' | 'mdy' | 'iso' | 'auto';
}

export default class IntervalSelector extends Generic<IntervalSelectorRxData, VisRxWidgetState> {
    private readonly refTimeSelector: React.RefObject<TimeSelectorNode | null> = React.createRef();

    private eventHandlers: TimeSelectorEventHandler[] = [];

    private timerInform?: ReturnType<typeof setTimeout>;

    private lastEvent?: string;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2IntervalSelector',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'interval_selector', // Label of widget
            visHelp: 'help_interval_selector', // Description in the palette
            visName: 'Interval selector',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            tooltip: 'without_card_tooltip',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            tooltip: 'widget_title_tooltip',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'timeStart-oid',
                            type: 'id',
                            label: 'time_start_oid',
                            tooltip: 'time_start_oid_tooltip',
                        },
                        {
                            name: 'timeInterval-oid',
                            type: 'id',
                            label: 'time_interval_oid',
                            tooltip: 'time_interval_oid_tooltip',
                        },
                    ],
                },
                {
                    name: 'appearance',
                    label: 'group_appearance',
                    fields: [
                        {
                            name: 'showDay',
                            type: 'checkbox',
                            label: 'show_day',
                            default: true,
                            tooltip: 'show_period_tooltip',
                        },
                        {
                            name: 'showWeek',
                            type: 'checkbox',
                            label: 'show_week',
                            default: true,
                            tooltip: 'show_period_tooltip',
                        },
                        {
                            name: 'showMonth',
                            type: 'checkbox',
                            label: 'show_month',
                            default: true,
                            tooltip: 'show_period_tooltip',
                        },
                        {
                            name: 'showYear',
                            type: 'checkbox',
                            label: 'show_year',
                            default: true,
                            tooltip: 'show_period_tooltip',
                        },
                        {
                            name: 'hideNow',
                            type: 'checkbox',
                            label: 'hide_now_button',
                            tooltip: 'hide_now_button_tooltip',
                        },
                        {
                            name: 'dateFormat',
                            type: 'select',
                            label: 'date_format',
                            tooltip: 'date_format_tooltip',
                            default: 'dmy',
                            options: [
                                { value: 'dmy', label: 'date_format_dmy' },
                                { value: 'mdy', label: 'date_format_mdy' },
                                { value: 'iso', label: 'date_format_iso' },
                                { value: 'auto', label: 'date_format_auto' },
                            ],
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 320,
                height: 60,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_interval_selector.png',
        };
    }

    propertiesUpdate(): void {
        const el = this.refTimeSelector.current;
        if (el && !el._addEventHandler) {
            el._addEventHandler = (cb: TimeSelectorEventHandler): void => {
                if (!this.eventHandlers.includes(cb)) {
                    this.eventHandlers.push(cb);
                    this.informSubscribers();
                }
            };
            el._removeEventHandler = (cb: TimeSelectorEventHandler): void => {
                const pos = this.eventHandlers.indexOf(cb);
                if (pos !== -1) {
                    this.eventHandlers.splice(pos, 1);
                }
            };
        }
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    componentWillUnmount(): void {
        this.timerInform && clearTimeout(this.timerInform);
        this.timerInform = undefined;
        this.eventHandlers.forEach(cb => cb('unmount'));
        const el = this.refTimeSelector.current;
        if (el) {
            el._addEventHandler = null;
            el._removeEventHandler = null;
        }
        super.componentWillUnmount();
    }

    onRxDataChanged(): void {
        this.propertiesUpdate();
    }

    getWidgetInfo(): RxWidgetInfo {
        return IntervalSelector.getWidgetInfo();
    }

    /** Periods the user enabled, never empty - with nothing enabled the widget would be useless */
    getPeriods(): TimeIntervalType[] {
        const enabled = ALL_PERIODS.filter(period => {
            const value = this.state.rxData[
                `show${period[0].toUpperCase()}${period.substring(1)}` as keyof IntervalSelectorRxData
            ];
            // `undefined` is a widget that was placed before these attributes existed: show everything
            return value === undefined || value === null || value === true || (value as unknown) === 'true';
        });

        return enabled.length ? enabled : ALL_PERIODS;
    }

    getTimeStart(): number {
        const value = this.state.rxData['timeStart-oid']
            ? this.state.values[`${this.state.rxData['timeStart-oid']}.val`]
            : // `timeStart` is typed as a string in vis-2, but it carries a timestamp
              (this.props.context.timeStart as unknown as number);

        return (value as number) || 0;
    }

    setTimeStart = (timeStart: number | null): void => {
        if (this.state.rxData['timeStart-oid']) {
            this.props.context.setValue(this.state.rxData['timeStart-oid'], timeStart);
        } else {
            this.props.context.setTimeStart(timeStart as unknown as string);
            this.informSubscribers(timeStart);
        }
    };

    getTimeInterval(): TimeIntervalType {
        const value = this.state.rxData['timeInterval-oid']
            ? this.state.values[`${this.state.rxData['timeInterval-oid']}.val`]
            : this.props.context.timeInterval;

        const periods = this.getPeriods();
        // A period that was switched off (or a nonsense value in the OID) must not leave the widget without a
        // highlighted button and the consumers without a usable interval
        return periods.includes(value as TimeIntervalType) ? (value as TimeIntervalType) : periods[0];
    }

    informSubscribers(start?: any, interval?: any): void {
        this.timerInform && clearTimeout(this.timerInform);
        this.timerInform = setTimeout(() => {
            const event = {
                interval: interval === null || interval === undefined ? this.getTimeInterval() : interval,
                start: start === null || start === undefined ? this.getTimeStart() : start,
            };
            const eventStr = JSON.stringify(event);

            if (eventStr !== this.lastEvent) {
                this.lastEvent = eventStr;

                this.eventHandlers.forEach(cb => {
                    try {
                        cb('update', event);
                    } catch (e) {
                        console.warn(e);
                    }
                });
            }
        }, 100);
    }

    onStateUpdated(id: string, state: ioBroker.State): void {
        if (id === this.state.rxData['timeInterval-oid']) {
            this.informSubscribers(null, state.val);
        } else if (id === this.state.rxData['timeStart-oid']) {
            this.informSubscribers(state.val);
        }
    }

    setTimeInterval = (timeInterval: string): void => {
        if (this.state.rxData['timeInterval-oid']) {
            this.props.context.setValue(this.state.rxData['timeInterval-oid'], timeInterval);
        } else {
            this.props.context.setTimeInterval(timeInterval);
            this.informSubscribers(null, timeInterval);
        }
    };

    /**
     * Name of the shown period, e.g. `24.09.2026`, `24.09 — 30.09`, `09.2026` or `2026`
     *
     * @param from - first moment of the period
     * @param to - last moment of the period
     * @returns The label shown between the two arrow buttons
     */
    renderPeriodName(from: Date, to: Date): React.ReactNode {
        const format = this.state.rxData.dateFormat || 'dmy';
        const lang = I18n.getLanguage();
        const pad = (n: number): string => n.toString().padStart(2, '0');

        const day = (date: Date, withYear: boolean): string => {
            if (format === 'iso') {
                return withYear
                    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
                    : `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            }
            if (format === 'mdy') {
                return withYear
                    ? `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`
                    : `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
            }
            if (format === 'auto') {
                return date.toLocaleDateString(lang, {
                    day: '2-digit',
                    month: '2-digit',
                    ...(withYear ? { year: 'numeric' } : {}),
                });
            }
            return withYear
                ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
                : `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
        };

        switch (this.getTimeInterval()) {
            case 'day':
                return day(from, true);
            case 'week':
                return (
                    <>
                        {day(from, false)} &mdash; {day(to, false)}
                    </>
                );
            case 'month':
                if (format === 'auto') {
                    return from.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
                }
                if (format === 'iso') {
                    return `${from.getFullYear()}-${pad(from.getMonth() + 1)}`;
                }
                return `${pad(from.getMonth() + 1)}.${from.getFullYear()}`;
            case 'year':
                return `${from.getFullYear()}`;
            default:
                return '';
        }
    }

    /**
     * Move the shown period one step back or forward
     *
     * @param from - first moment of the currently shown period
     * @param direction - -1 for the previous period, 1 for the next one
     */
    shiftPeriod(from: Date, direction: -1 | 1): void {
        const interval = this.getTimeInterval();
        const newStart = new Date(from);

        if (interval === 'day') {
            newStart.setDate(newStart.getDate() + direction);
        } else if (interval === 'week') {
            newStart.setDate(newStart.getDate() + 7 * direction);
        } else if (interval === 'month') {
            newStart.setMonth(newStart.getMonth() + direction);
        } else if (interval === 'year') {
            newStart.setFullYear(newStart.getFullYear() + direction);
        }

        if (direction === 1) {
            // Never step past the running period: `null` means "now" and re-enables the live update
            const reached =
                getFromToTime(newStart, interval).from.getTime() >= getFromToTime(null, interval).from.getTime();
            this.setTimeStart(reached ? null : newStart.getTime());
        } else {
            this.setTimeStart(newStart.getTime());
        }
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const interval = getFromToTime(this.getTimeStart(), this.getTimeInterval());
        const periods = this.getPeriods();

        const content = (
            <div
                style={styles.contentContainer}
                className="time-selector"
                ref={this.refTimeSelector}
            >
                <div style={styles.content}>
                    <span style={styles.periodName}>{this.renderPeriodName(interval.from, interval.to)}</span>
                    <Tooltip title={Generic.t('previous_period')}>
                        <IconButton onClick={() => this.shiftPeriod(interval.from, -1)}>
                            <NavigateBeforeIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={Generic.t('next_period')}>
                        <span>
                            <IconButton
                                disabled={!this.getTimeStart()}
                                onClick={() => this.shiftPeriod(interval.from, 1)}
                            >
                                <NavigateNextIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {this.state.rxData.hideNow ? null : (
                        <Button
                            variant="contained"
                            color="grey"
                            disabled={!this.getTimeStart()}
                            onClick={() => this.setTimeStart(0)}
                            style={styles.nowButton}
                        >
                            {Generic.t('now')}
                        </Button>
                    )}
                    {periods.length > 1 ? (
                        <ButtonGroup>
                            {periods.map(period => (
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
                                    {Generic.t(period)}
                                </Button>
                            ))}
                        </ButtonGroup>
                    ) : null}
                </div>
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center', padding: 0, height: '100%' });
    }
}
