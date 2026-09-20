import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxData, VisRxWidgetState, WidgetData } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { cleanOid, formatDuration, formatNumber, toNumber } from './Utils';
import { SizeWatcher } from './SizeWatcher';

interface BatteryState extends VisRxWidgetState {
    width?: number;
    height?: number;
}

interface BatteryRxData extends VisRxData {
    noCard: boolean;
    widgetTitle: string;
    orientation: 'vertical' | 'horizontal';
    decimals: number;
    useThresholds: boolean;
    lowLevel: number;
    mediumLevel: number;
    lowColor: string;
    mediumColor: string;
    highColor: string;
    fixedColor: string;
    showPower: boolean;
    showRemaining: boolean;

    'soc-oid': string;
    socFactor: number | string;
    'power-oid': string;
    positiveIs: 'charge' | 'discharge';
    'chargePower-oid': string;
    'dischargePower-oid': string;
    separatePower: boolean;
    powerFactor: number | string;
    powerUnit: string;
    capacity: number | string;
    'capacity-oid': string;
    capacityUnit: string;
}

/** Everything the widget shows, already normalized */
interface BatteryValues {
    /** State of charge in percent, or null when it is not configured / not known yet */
    soc: number | null;
    /** Power in the configured unit: positive charges the battery, negative discharges it */
    power: number | null;
    /** Usable capacity in the capacity unit, or null when it is not configured */
    capacity: number | null;
}

const styles: Record<string, React.CSSProperties> = {
    content: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        gap: 12,
    },
    texts: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
    },
    soc: {
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
    },
    line: {
        whiteSpace: 'nowrap',
        opacity: 0.85,
        fontVariantNumeric: 'tabular-nums',
    },
};

/** Ratio of the body of the battery symbol that the cap takes */
const CAP_RATIO = 0.08;

/**
 * Width of the longest line, in multiples of the font size.
 *
 * The lines under the percentage are drawn at 70 % of the font size, and the longest of them is the remaining
 * time ("Full in 1 h 36 min"), which is about 18 characters of roughly half a font size each.
 */
const LONGEST_LINE_IN_CHARS = 6.5;

class Battery extends Generic<BatteryRxData, BatteryState> {
    private readonly refContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    private readonly sizeWatcher = new SizeWatcher((width, height) => {
        if (width !== this.state.width || height !== this.state.height) {
            this.setState({ width, height });
        }
    });

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2Battery',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'battery', // Label of widget
            visHelp: 'help_battery', // Description in the palette
            visName: 'Battery',
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
                            name: 'orientation',
                            label: 'orientation',
                            type: 'select',
                            tooltip: 'battery_orientation_tooltip',
                            default: 'vertical',
                            options: [
                                { value: 'vertical', label: 'orientation_vertical' },
                                { value: 'horizontal', label: 'orientation_horizontal' },
                            ],
                        },
                        {
                            name: 'showPower',
                            label: 'show_power',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'show_power_tooltip',
                        },
                        {
                            name: 'showRemaining',
                            label: 'show_remaining',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'show_remaining_tooltip',
                        },
                        {
                            name: 'decimals',
                            label: 'decimals',
                            type: 'slider',
                            min: 0,
                            max: 3,
                            default: 0,
                            tooltip: 'decimals_tooltip',
                        },
                    ],
                },
                {
                    name: 'values',
                    label: 'group_values',
                    fields: [
                        {
                            name: 'soc-oid',
                            label: 'soc_oid',
                            type: 'id',
                            tooltip: 'soc_oid_tooltip',
                        },
                        {
                            name: 'socFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'soc_factor_tooltip',
                        },
                        {
                            name: 'separatePower',
                            label: 'separate_power_oids',
                            type: 'checkbox',
                            tooltip: 'separate_power_oids_tooltip',
                        },
                        {
                            name: 'power-oid',
                            label: 'battery_power_oid',
                            type: 'id',
                            tooltip: 'battery_power_oid_tooltip',
                            hidden: (data: WidgetData) => !!data.separatePower,
                        },
                        {
                            name: 'positiveIs',
                            label: 'positive_is',
                            type: 'select',
                            tooltip: 'positive_is_tooltip',
                            default: 'charge',
                            options: [
                                { value: 'charge', label: 'charging' },
                                { value: 'discharge', label: 'discharging' },
                            ],
                            hidden: (data: WidgetData) => !!data.separatePower,
                        },
                        {
                            name: 'chargePower-oid',
                            label: 'charge_power_oid',
                            type: 'id',
                            tooltip: 'charge_power_oid_tooltip',
                            hidden: (data: WidgetData) => !data.separatePower,
                        },
                        {
                            name: 'dischargePower-oid',
                            label: 'discharge_power_oid',
                            type: 'id',
                            tooltip: 'discharge_power_oid_tooltip',
                            hidden: (data: WidgetData) => !data.separatePower,
                        },
                        {
                            name: 'powerFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'powerUnit',
                            label: 'power_unit',
                            default: 'W',
                            tooltip: 'power_unit_tooltip',
                        },
                        {
                            name: 'capacity',
                            label: 'capacity',
                            type: 'number',
                            tooltip: 'capacity_tooltip',
                        },
                        {
                            name: 'capacity-oid',
                            label: 'capacity_oid',
                            type: 'id',
                            tooltip: 'capacity_oid_tooltip',
                        },
                        {
                            name: 'capacityUnit',
                            label: 'capacity_unit',
                            default: 'kWh',
                            tooltip: 'capacity_unit_tooltip',
                        },
                    ],
                },
                {
                    name: 'colors',
                    label: 'group_colors',
                    fields: [
                        {
                            name: 'useThresholds',
                            label: 'use_thresholds',
                            type: 'checkbox',
                            default: true,
                            tooltip: 'use_thresholds_tooltip',
                        },
                        {
                            name: 'lowLevel',
                            label: 'low_level',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            default: 20,
                            tooltip: 'low_level_tooltip',
                            hidden: (data: WidgetData) => !data.useThresholds,
                        },
                        {
                            name: 'mediumLevel',
                            label: 'medium_level',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            default: 50,
                            tooltip: 'medium_level_tooltip',
                            hidden: (data: WidgetData) => !data.useThresholds,
                        },
                        {
                            name: 'lowColor',
                            label: 'low_color',
                            type: 'color',
                            default: '#e53935',
                            hidden: (data: WidgetData) => !data.useThresholds,
                        },
                        {
                            name: 'mediumColor',
                            label: 'medium_color',
                            type: 'color',
                            default: '#fb8c00',
                            hidden: (data: WidgetData) => !data.useThresholds,
                        },
                        {
                            name: 'highColor',
                            label: 'high_color',
                            type: 'color',
                            default: '#43a047',
                            hidden: (data: WidgetData) => !data.useThresholds,
                        },
                        {
                            name: 'fixedColor',
                            label: 'fill_color',
                            type: 'color',
                            default: '#43a047',
                            hidden: (data: WidgetData) => !!data.useThresholds,
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 200,
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_battery.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return Battery.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sizeWatcher.observe(this.refContent.current);
    }

    componentDidUpdate(prevProps: any, prevState: any): void {
        super.componentDidUpdate(prevProps, prevState);
        this.sizeWatcher.observe(this.refContent.current);
    }

    componentWillUnmount(): void {
        this.sizeWatcher.disconnect();
        super.componentWillUnmount();
    }

    /**
     * Read a configured object ID
     *
     * @param field - name of the `id` attribute
     * @returns The raw value, or null when the object ID is not configured or has no value yet
     */
    readValue(field: keyof BatteryRxData): number | null {
        const oid = cleanOid(this.state.rxData[field] as string);
        return oid ? toNumber(this.state.values[`${oid}.val`]) : null;
    }

    /**
     * State of charge, power and capacity, all in the configured units
     *
     * @returns The values, with a positive power meaning "the battery is being charged"
     */
    getValues(): BatteryValues {
        const socRaw = this.readValue('soc-oid');
        const socFactor = parseFloat(this.state.rxData.socFactor as string) || 1;
        const soc = socRaw === null ? null : Math.min(Math.max(socRaw * socFactor, 0), 100);

        const powerFactor = parseFloat(this.state.rxData.powerFactor as string) || 1;
        let power: number | null;
        if (this.state.rxData.separatePower) {
            const charge = this.readValue('chargePower-oid');
            const discharge = this.readValue('dischargePower-oid');
            power =
                charge === null && discharge === null
                    ? null
                    : (Math.max(charge ?? 0, 0) - Math.max(discharge ?? 0, 0)) * powerFactor;
        } else {
            const raw = this.readValue('power-oid');
            // Inverters disagree about the sign; normalize to "positive charges the battery"
            power = raw === null ? null : raw * powerFactor * (this.state.rxData.positiveIs === 'discharge' ? -1 : 1);
        }

        const capacity = this.readValue('capacity-oid') ?? (parseFloat(this.state.rxData.capacity as string) || null);

        return { soc, power, capacity };
    }

    /**
     * Color of the filled part of the battery
     *
     * @param soc - the state of charge in percent
     * @returns A CSS color
     */
    getFillColor(soc: number | null): string {
        if (!this.state.rxData.useThresholds) {
            return this.state.rxData.fixedColor || '#43a047';
        }
        if (soc === null) {
            return this.state.rxData.lowColor || '#e53935';
        }
        if (soc <= (this.state.rxData.lowLevel ?? 20)) {
            return this.state.rxData.lowColor || '#e53935';
        }
        if (soc <= (this.state.rxData.mediumLevel ?? 50)) {
            return this.state.rxData.mediumColor || '#fb8c00';
        }
        return this.state.rxData.highColor || '#43a047';
    }

    /**
     * How long the battery still charges or discharges at the current power
     *
     * @param values - the current state of the battery
     * @returns The formatted duration, or null when it cannot be estimated
     */
    getRemaining(values: BatteryValues): string | null {
        const { soc, power, capacity } = values;
        if (soc === null || !power || !capacity) {
            return null;
        }
        // The capacity is given in an energy unit (kWh) and the power in a power unit (W or kW), so the two
        // have to be brought together. `W` is the only one that needs scaling; everything else is assumed to
        // already match the capacity unit.
        const powerInCapacityUnit = this.state.rxData.powerUnit === 'W' ? power / 1000 : power;
        if (!powerInCapacityUnit) {
            return null;
        }

        const share = power > 0 ? (100 - soc) / 100 : soc / 100;
        const hours = (capacity * share) / Math.abs(powerInCapacityUnit);

        return formatDuration(hours);
    }

    /**
     * The battery symbol, filled according to the state of charge
     *
     * @param soc - the state of charge in percent, null draws an empty battery
     * @param width - width of the symbol
     * @param height - height of the symbol
     * @returns The symbol
     */
    renderSymbol(soc: number | null, width: number, height: number): React.JSX.Element {
        const vertical = (this.state.rxData.orientation || 'vertical') === 'vertical';
        const stroke = this.props.context.theme.palette.text.primary;
        const strokeWidth = Math.max(Math.round(Math.min(width, height) / 25), 2);
        const radius = strokeWidth * 2;
        const capSize = Math.max(Math.round((vertical ? height : width) * CAP_RATIO), 3);
        const capLength = Math.round((vertical ? width : height) * 0.4);

        // Body of the battery, the cap sits on top (vertical) or on the right (horizontal)
        const bodyX = vertical ? strokeWidth / 2 : strokeWidth / 2;
        const bodyY = vertical ? capSize + strokeWidth / 2 : strokeWidth / 2;
        const bodyW = (vertical ? width : width - capSize) - strokeWidth;
        const bodyH = (vertical ? height - capSize : height) - strokeWidth;

        const inset = strokeWidth * 1.5;
        const fillMax = vertical ? bodyH - inset * 2 : bodyW - inset * 2;
        const fillSize = Math.max((fillMax * (soc ?? 0)) / 100, 0);

        return (
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                <rect
                    x={vertical ? (width - capLength) / 2 : width - capSize}
                    y={vertical ? 0 : (height - capLength) / 2}
                    width={vertical ? capLength : capSize}
                    height={vertical ? capSize : capLength}
                    rx={strokeWidth}
                    fill={stroke}
                />
                <rect
                    x={bodyX}
                    y={bodyY}
                    width={bodyW}
                    height={bodyH}
                    rx={radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                />
                <rect
                    x={vertical ? bodyX + inset : bodyX + inset}
                    y={vertical ? bodyY + inset + (fillMax - fillSize) : bodyY + inset}
                    width={vertical ? bodyW - inset * 2 : fillSize}
                    height={vertical ? fillSize : bodyH - inset * 2}
                    rx={strokeWidth}
                    fill={this.getFillColor(soc)}
                    style={{ transition: 'all 0.5s linear' }}
                />
            </svg>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        if (!this.refContent.current) {
            setTimeout(() => this.sizeWatcher.observe(this.refContent.current), 50);
        }

        const values = this.getValues();
        const decimals = this.state.rxData.decimals ?? 0;
        const vertical = (this.state.rxData.orientation || 'vertical') === 'vertical';

        const width = this.state.width || 0;
        const height = this.state.height || 0;
        // The symbol gets a share of the widget, the rest is for the texts next to (or under) it
        const symbolWidth = Math.max(Math.floor(vertical ? Math.min(width * 0.4, height * 0.6) : width * 0.55), 0);
        const symbolHeight = Math.max(Math.floor(vertical ? height * 0.9 : Math.min(height * 0.5, width * 0.3)), 0);
        // The text has to fit into the column NEXT to the symbol, not into the whole widget. Sizing it by the
        // widget alone made the longest line ("Full in 1 h 36 min") run out of the card on a large widget.
        const textWidth = vertical ? Math.max(width - symbolWidth - 12, 0) : width;
        const fontSize = Math.min(
            Math.max(Math.round(Math.min(textWidth / LONGEST_LINE_IN_CHARS, height / 4.5)), 10),
            44,
        );

        const remaining = this.state.rxData.showRemaining ? this.getRemaining(values) : null;
        const powerUnit = this.state.rxData.powerUnit || 'W';
        const capacityUnit = this.state.rxData.capacityUnit || 'kWh';

        const content = (
            <div
                ref={this.refContent}
                style={{ ...styles.content, flexDirection: vertical ? 'row' : 'column' }}
            >
                {symbolWidth > 10 && symbolHeight > 10 ? (
                    <>
                        {this.renderSymbol(values.soc, symbolWidth, symbolHeight)}
                        <div style={styles.texts}>
                            <div style={{ ...styles.soc, fontSize }}>
                                {values.soc === null ? '--' : `${formatNumber(values.soc, decimals)} %`}
                            </div>
                            {this.state.rxData.showPower && values.power !== null ? (
                                <div style={{ ...styles.line, fontSize: fontSize * 0.7 }}>
                                    {`${values.power > 0 ? '↑' : values.power < 0 ? '↓' : ''}${formatNumber(
                                        Math.abs(values.power),
                                        decimals,
                                    )} ${powerUnit}`}
                                </div>
                            ) : null}
                            {remaining ? (
                                <div style={{ ...styles.line, fontSize: fontSize * 0.7 }}>
                                    {`${Generic.t(values.power && values.power > 0 ? 'until_full' : 'until_empty')} ${remaining}`}
                                </div>
                            ) : null}
                            {values.capacity && values.soc !== null ? (
                                <div style={{ ...styles.line, fontSize: fontSize * 0.7 }}>
                                    {`${formatNumber((values.capacity * values.soc) / 100, 1)} / ${formatNumber(
                                        values.capacity,
                                        1,
                                    )} ${capacityUnit}`}
                                </div>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, { textAlign: 'center' });
    }
}

export default Battery;
