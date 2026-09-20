/**
 * Reading history data for the chart widgets.
 *
 * Extracted from `Consumption` so that every widget that shows a period (`Consumption`, `EnergyCosts`) reads its
 * data the same way instead of carrying its own copy of the bucketing and of the counter handling.
 */
import type { Connection } from '@iobroker/gui-components';

import { getIntervalSteps } from './Utils';

/** One bar of a chart: the start of its bucket and the value of that bucket */
export interface HistoryPoint {
    ts: number;
    val: number;
}

export type AggregateType =
    | 'minmax'
    | 'max'
    | 'min'
    | 'average'
    | 'total'
    | 'count'
    | 'percentile'
    | 'quantile'
    | 'integral'
    | 'none';

export interface SeriesRequest {
    socket: Connection;
    /** Object ID to read */
    id: string;
    /** History instance, e.g. `history.0`, `sql.0`, `influxdb.0` */
    instance: string;
    /** First moment of the shown period */
    from: Date;
    /** Last moment of the shown period */
    to: Date;
    /** Number of buckets the period is split into */
    steps: number;
    aggregate: AggregateType;
    /** The OID is a monotonically increasing counter: show the difference between two buckets */
    difference: boolean;
    percentile?: number;
    quantile?: number;
    integralUnit?: number;
    integralInterpolation?: 'none' | 'linear';
    /** Give up after this many milliseconds. A missing history instance never answers at all. */
    timeout?: number;
}

/** A history instance that is not installed never answers and never rejects, so every read needs a deadline */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * `socket.getHistory()` with a deadline
 *
 * @param socket - the vis-2 socket from `props.context`
 * @param id - object ID to read
 * @param options - options for `getHistory`
 * @param timeout - deadline in milliseconds
 * @returns The history, or an empty list if nothing answered in time
 */
export function getHistory(
    socket: Connection,
    id: string,
    options: ioBroker.GetHistoryOptions,
    timeout = DEFAULT_TIMEOUT_MS,
): Promise<ioBroker.GetHistoryResult> {
    return new Promise(resolve => {
        let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
            timer = null;
            console.warn(`No answer from "${options.instance}" for "${id}" within ${timeout} ms`);
            resolve([]);
        }, timeout);

        socket
            .getHistory(id, options)
            .then(result => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                    resolve(result);
                } else {
                    console.warn(`Too late answer for ${id}`);
                }
            })
            .catch(e => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                    console.warn(`Cannot read history of "${id}": ${e as string}`);
                    resolve([]);
                }
            });
    });
}

/**
 * Read one object ID as a series of buckets over a period
 *
 * @param request - what to read and how to split it
 * @returns One point per bucket, always exactly `request.steps` of them
 */
export async function readSeries(request: SeriesRequest): Promise<HistoryPoint[]> {
    const { steps, from, to } = request;
    const periodStart = from.getTime();
    const periodEnd = to.getTime();
    // `to` is the LAST millisecond of the period (23:59:59.999), so the period is one millisecond longer
    // than `to - from`. Without that millisecond every edge lands just before the full hour, and formatting
    // it with `HH:00` then names the previous hour - the axis showed "12:00" twice and never reached 23:00.
    const stepSize = (periodEnd - periodStart + 1) / steps;

    // Left edge of every bucket, plus the right edge of the last one
    const edges: number[] = [];
    for (let i = 0; i <= steps; i++) {
        edges.push(Math.round(periodStart + stepSize * i));
    }

    // For a counter the value of the first bucket is only known once the value BEFORE the period is known,
    // so one extra bucket is read in front of it.
    const readFrom = request.difference ? periodStart - stepSize : periodStart;

    const options: ioBroker.GetHistoryOptions = {
        instance: request.instance,
        start: Math.round(readFrom),
        end: periodEnd,
        count: request.difference ? steps + 1 : steps,
        from: false,
        ack: false,
        q: false,
        aggregate: request.aggregate || 'total',
        percentile: request.percentile,
        quantile: request.quantile,
        integralUnit: request.integralUnit,
        integralInterpolation: request.integralInterpolation,
    };

    const values = (await getHistory(request.socket, request.id, options, request.timeout)) as Array<
        ioBroker.State & { ts: number }
    >;

    const history = values
        .filter(item => item && item.val !== undefined && item.val !== null && typeof item.ts === 'number')
        .sort((a, b) => a.ts - b.ts);

    if (request.difference) {
        // Consumption of a bucket is the counter at its end minus the counter at the end of the one before it.
        // With an aggregation of `max` that is exactly the aggregated sample of each bucket.
        let previous = history.findLast(item => item.ts < edges[0]) ?? null;
        const result: HistoryPoint[] = [];

        for (let i = 0; i < steps; i++) {
            // The last bucket ends ON `periodEnd`, so its right edge has to be inclusive - otherwise the
            // current hour / day / month was silently dropped and the chart showed one bar too few.
            const isLast = i === steps - 1;
            const sample = history.find(
                item => item.ts >= edges[i] && (isLast ? item.ts <= edges[i + 1] : item.ts < edges[i + 1]),
            );

            if (sample && previous) {
                const diff = (sample.val as number) - (previous.val as number);
                // A counter that was reset would produce a huge negative bar; show a gap instead
                result.push({ ts: edges[i], val: diff >= 0 ? diff : 0 });
            } else {
                result.push({ ts: edges[i], val: 0 });
            }
            if (sample) {
                previous = sample;
            }
        }

        return result;
    }

    const result: HistoryPoint[] = [];
    for (let i = 0; i < steps; i++) {
        const isLast = i === steps - 1;
        const sample = history.findLast(
            item => item.ts >= edges[i] && (isLast ? item.ts <= edges[i + 1] : item.ts < edges[i + 1]),
        );
        result.push({ ts: edges[i], val: sample ? ((sample.val as number) ?? 0) : 0 });
    }

    return result;
}

/**
 * Read the total of one object ID over a period
 *
 * @param request - what to read; `steps` is derived from the period when it is not given
 * @returns The sum of all buckets, or null when nothing could be read
 */
export async function readTotal(request: Omit<SeriesRequest, 'steps'> & { steps?: number }): Promise<number | null> {
    const steps = request.steps ?? getIntervalSteps('day', request.from);
    const series = await readSeries({ ...request, steps });
    if (!series.length) {
        return null;
    }
    return series.reduce((sum, point) => sum + (Number.isFinite(point.val) ? point.val : 0), 0);
}
