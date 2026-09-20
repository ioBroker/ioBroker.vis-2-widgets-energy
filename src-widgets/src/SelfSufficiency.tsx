import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxData, VisRxWidgetState, WidgetData } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { cleanOid, describeArc, formatNumber, toNumber } from './Utils';
import { SizeWatcher } from './SizeWatcher';

interface SelfSufficiencyState extends VisRxWidgetState {
    width?: number;
    height?: number;
}

interface SelfSufficiencyRxData extends VisRxData {
    noCard: boolean;
    widgetTitle: string;
    show: 'both' | 'autarky' | 'selfConsumption';
    thickness: number;
    decimals: number;
    autarkyColor: string;
    selfConsumptionColor: string;
    trackColor: string;
    showValues: boolean;
    unit: string;

    'production-oid': string;
    productionFactor: number | string;
    singleGridOid: boolean;
    'grid-oid': string;
    'gridImport-oid': string;
    'gridExport-oid': string;
    gridFactor: number | string;
    'consumption-oid': string;
    consumptionFactor: number | string;
}

/** The two numbers this widget is about */
interface Quota {
    /** Share of the consumption that did not come from the grid, 0..1 */
    autarky: number | null;
    /** Share of the production that was used at home instead of being fed into the grid, 0..1 */
    selfConsumption: number | null;
    production: number;
    consumption: number;
    gridImport: number;
    gridExport: number;
    /** Production that was consumed at home */
    selfConsumed: number;
}

const styles: Record<string, React.CSSProperties> = {
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    gauges: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flex: 1,
        minHeight: 0,
        gap: 8,
    },
    gauge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
    },
    gaugeLabel: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        opacity: 0.8,
    },
    values: {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        columnGap: 12,
        width: '100%',
        padding: '0 8px',
        boxSizing: 'border-box',
    },
    valueName: {
        opacity: 0.8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        // The card centers its content, which would leave the names floating in the middle of their column
        textAlign: 'left',
    },
    valueNumber: {
        textAlign: 'right',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
    },
};

/** Text size of the captions and of the value table, derived from the size of the widget */
function getFontSize(width: number, height: number): number {
    return Math.min(Math.max(Math.round(Math.min(width, height) / 16), 10), 20);
}

class SelfSufficiency extends Generic<SelfSufficiencyRxData, SelfSufficiencyState> {
    private readonly refContent: React.RefObject<HTMLDivElement | null> = React.createRef();

    private readonly sizeWatcher = new SizeWatcher((width, height) => {
        if (width !== this.state.width || height !== this.state.height) {
            this.setState({ width, height });
        }
    });

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplEnergy2SelfSufficiency',
            visSet: 'vis-2-widgets-energy',
            visWidgetLabel: 'self_sufficiency', // Label of widget
            visHelp: 'help_self_sufficiency', // Description in the palette
            visName: 'Self sufficiency',
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
                            name: 'show',
                            label: 'show',
                            type: 'select',
                            tooltip: 'self_sufficiency_show_tooltip',
                            default: 'both',
                            options: [
                                { value: 'both', label: 'show_both' },
                                { value: 'autarky', label: 'autarky' },
                                { value: 'selfConsumption', label: 'self_consumption' },
                            ],
                        },
                        {
                            name: 'showValues',
                            label: 'show_values',
                            type: 'checkbox',
                            tooltip: 'self_sufficiency_values_tooltip',
                        },
                        {
                            name: 'unit',
                            label: 'unit',
                            tooltip: 'self_sufficiency_unit_tooltip',
                            hidden: (data: WidgetData) => !data.showValues,
                        },
                        {
                            name: 'decimals',
                            label: 'decimals',
                            type: 'slider',
                            min: 0,
                            max: 2,
                            default: 0,
                            tooltip: 'decimals_tooltip',
                        },
                        {
                            name: 'thickness',
                            label: 'ring_thickness',
                            type: 'slider',
                            min: 4,
                            max: 30,
                            default: 12,
                            tooltip: 'ring_thickness_tooltip',
                        },
                        {
                            name: 'autarkyColor',
                            label: 'autarky_color',
                            type: 'color',
                            default: '#4caf50',
                            tooltip: 'autarky_color_tooltip',
                        },
                        {
                            name: 'selfConsumptionColor',
                            label: 'self_consumption_color',
                            type: 'color',
                            default: '#ffb300',
                            tooltip: 'self_consumption_color_tooltip',
                        },
                        {
                            name: 'trackColor',
                            label: 'track_color',
                            type: 'color',
                            tooltip: 'track_color_tooltip',
                        },
                    ],
                },
                {
                    name: 'sources',
                    label: 'group_sources',
                    fields: [
                        {
                            name: 'production-oid',
                            label: 'production_oid',
                            type: 'id',
                            tooltip: 'production_oid_tooltip',
                        },
                        {
                            name: 'productionFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'singleGridOid',
                            label: 'single_grid_oid',
                            type: 'checkbox',
                            tooltip: 'single_grid_oid_tooltip',
                        },
                        {
                            name: 'grid-oid',
                            label: 'grid_oid',
                            type: 'id',
                            tooltip: 'grid_oid_tooltip',
                            hidden: (data: WidgetData) => !data.singleGridOid,
                        },
                        {
                            name: 'gridImport-oid',
                            label: 'grid_import_oid',
                            type: 'id',
                            tooltip: 'grid_import_oid_tooltip',
                            hidden: (data: WidgetData) => !!data.singleGridOid,
                        },
                        {
                            name: 'gridExport-oid',
                            label: 'grid_export_oid',
                            type: 'id',
                            tooltip: 'grid_export_oid_tooltip',
                            hidden: (data: WidgetData) => !!data.singleGridOid,
                        },
                        {
                            name: 'gridFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                        {
                            name: 'consumption-oid',
                            label: 'house_consumption_oid',
                            type: 'id',
                            tooltip: 'house_consumption_oid_tooltip',
                        },
                        {
                            name: 'consumptionFactor',
                            label: 'factor',
                            type: 'number',
                            default: 1,
                            tooltip: 'factor_tooltip',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 320,
                height: 182,
                position: 'relative',
            },
            visPrev: 'widgets/vis-2-widgets-energy/img/prev_self_sufficiency.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return SelfSufficiency.getWidgetInfo();
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
     * Read one configured object ID and apply its factor
     *
     * @param field - name of the `id` attribute, e.g. `production-oid`
     * @param factorField - name of the number attribute with the multiplier
     * @returns The value, or null when the object ID is not configured or has no value yet
     */
    readValue(field: keyof SelfSufficiencyRxData, factorField: keyof SelfSufficiencyRxData): number | null {
        const oid = cleanOid(this.state.rxData[field] as string);
        if (!oid) {
            return null;
        }
        const value = toNumber(this.state.values[`${oid}.val`]);
        if (value === null) {
            return null;
        }
        return value * (parseFloat(this.state.rxData[factorField] as string) || 1);
    }

    /**
     * The whole energy balance of the house
     *
     * All four inputs have to share one unit - the two quotas are ratios, so the unit itself does not matter,
     * but mixing W and kW does.
     *
     * @returns The two quotas plus the numbers they were calculated from
     */
    getQuota(): Quota {
        const production = Math.max(this.readValue('production-oid', 'productionFactor') ?? 0, 0);

        let gridImport = 0;
        let gridExport = 0;
        if (this.state.rxData.singleGridOid) {
            // One datapoint for both directions: positive is taken from the grid, negative is fed into it
            const grid = this.readValue('grid-oid', 'gridFactor') ?? 0;
            gridImport = Math.max(grid, 0);
            gridExport = Math.max(-grid, 0);
        } else {
            gridImport = Math.max(this.readValue('gridImport-oid', 'gridFactor') ?? 0, 0);
            gridExport = Math.max(this.readValue('gridExport-oid', 'gridFactor') ?? 0, 0);
        }

        const givenConsumption = this.readValue('consumption-oid', 'consumptionFactor');
        // Without its own datapoint the house consumption follows from the balance of the other three
        const consumption = Math.max(givenConsumption ?? production - gridExport + gridImport, 0);

        // What was produced and not sold. It can never be more than what was consumed at home.
        const selfConsumed = Math.min(Math.max(production - gridExport, 0), consumption || Infinity);

        const clamp = (value: number): number => Math.min(Math.max(value, 0), 1);

        return {
            autarky: consumption > 0 ? clamp((consumption - gridImport) / consumption) : null,
            selfConsumption: production > 0 ? clamp(selfConsumed / production) : null,
            production,
            consumption,
            gridImport,
            gridExport,
            selfConsumed,
        };
    }

    /**
     * One ring gauge
     *
     * @param value - the quota to show, 0..1, or null when it cannot be calculated
     * @param label - caption under the ring
     * @param color - color of the filled part
     * @param size - outer diameter in pixels
     * @param captionFontSize - text size of the caption under the ring
     * @returns The gauge
     */
    renderGauge(
        value: number | null,
        label: string,
        color: string,
        size: number,
        captionFontSize: number,
    ): React.JSX.Element {
        const thickness = Math.min(Number(this.state.rxData.thickness) || 12, size / 3);
        const radius = (size - thickness) / 2;
        const center = size / 2;
        const track =
            this.state.rxData.trackColor ||
            (this.props.context.themeType === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)');
        const percent = value === null ? 0 : value * 100;
        const fontSize = Math.max(Math.round(size / 4.5), 10);

        return (
            <div
                style={styles.gauge}
                key={label}
            >
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={track}
                        strokeWidth={thickness}
                    />
                    {value === null ? null : (
                        <path
                            d={describeArc(center, center, radius, 0, percent * 3.6)}
                            fill="none"
                            stroke={color}
                            strokeWidth={thickness}
                            strokeLinecap="round"
                            style={{ transition: 'd 0.5s linear' }}
                        />
                    )}
                    <text
                        x={center}
                        y={center}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fontSize}
                        fill={this.props.context.theme.palette.text.primary}
                    >
                        {value === null ? '--' : `${formatNumber(percent, this.state.rxData.decimals ?? 0)} %`}
                    </text>
                </svg>
                <div
                    style={{ ...styles.gaugeLabel, fontSize: captionFontSize, lineHeight: 1.4, width: size }}
                    title={label}
                >
                    {label}
                </div>
            </div>
        );
    }

    /**
     * The absolute numbers below the gauges
     *
     * @param quota - the calculated balance
     * @param fontSize - text size of the rows
     * @returns The table, or null when it was switched off
     */
    renderValues(quota: Quota, fontSize: number): React.JSX.Element | null {
        if (!this.state.rxData.showValues) {
            return null;
        }
        const unit = this.state.rxData.unit ? ` ${this.state.rxData.unit}` : '';
        const decimals = this.state.rxData.decimals ?? 0;
        const rows: Array<[string, number]> = [
            [Generic.t('production'), quota.production],
            [Generic.t('house_consumption'), quota.consumption],
            [Generic.t('grid_import'), quota.gridImport],
            [Generic.t('grid_export'), quota.gridExport],
        ];

        return (
            <div style={{ ...styles.values, fontSize, lineHeight: 1.35 }}>
                {rows.map(([name, value]) => (
                    <React.Fragment key={name}>
                        <div style={styles.valueName}>{name}</div>
                        <div style={styles.valueNumber}>{`${formatNumber(value, decimals)}${unit}`}</div>
                    </React.Fragment>
                ))}
            </div>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        if (!this.refContent.current) {
            setTimeout(() => this.sizeWatcher.observe(this.refContent.current), 50);
        }

        const quota = this.getQuota();
        const show = this.state.rxData.show || 'both';
        const gauges: Array<{ value: number | null; label: string; color: string }> = [];

        if (show === 'both' || show === 'autarky') {
            gauges.push({
                value: quota.autarky,
                label: Generic.t('autarky'),
                color: this.state.rxData.autarkyColor || '#4caf50',
            });
        }
        if (show === 'both' || show === 'selfConsumption') {
            gauges.push({
                value: quota.selfConsumption,
                label: Generic.t('self_consumption'),
                color: this.state.rxData.selfConsumptionColor || '#ffb300',
            });
        }

        const width = this.state.width || 0;
        const height = this.state.height || 0;
        // The text has to be sized BEFORE the rings: it is what is left over that the rings may use. Deriving
        // the caption size from the ring instead made the caption grow with the widget until it ran into the
        // value table below it.
        const fontSize = getFontSize(width, height);
        const valuesHeight = this.state.rxData.showValues ? 4 * Math.round(fontSize * 1.35) : 0;
        const captionHeight = Math.round(fontSize * 1.4);

        // Fit the rings into whatever is left: the width has to hold all of them next to each other, the
        // height has to hold one plus its caption and the optional value table
        const size = Math.max(
            Math.min(
                Math.floor((width - 8 * gauges.length) / gauges.length),
                Math.floor(height - valuesHeight - captionHeight),
            ),
            0,
        );

        const content = (
            <div
                ref={this.refContent}
                style={styles.content}
            >
                {size > 20 ? (
                    <>
                        <div style={styles.gauges}>
                            {gauges.map(gauge =>
                                this.renderGauge(gauge.value, gauge.label, gauge.color, size, fontSize),
                            )}
                        </div>
                        {this.renderValues(quota, fontSize)}
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

export default SelfSufficiency;
