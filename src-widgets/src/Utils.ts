export interface FromToTime {
    from: Date;
    to: Date;
}

/** The periods the interval selector can switch between */
export type TimeIntervalType = 'day' | 'week' | 'month' | 'year';

export function getFromToTime(timeStart: number | Date | null | undefined, timeInterval: string): FromToTime {
    const from = new Date(timeStart || Date.now());
    const to = new Date(timeStart || Date.now());
    if (timeInterval === 'day') {
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
    } else if (timeInterval === 'week') {
        // getDay() returns 0 for Sunday; treat it as 7 so the week always starts on
        // Monday and the current Sunday stays inside its own week (#270, #290).
        // Otherwise, on Sundays the whole week window was shifted forward by 7 days.
        const dayOfWeek = from.getDay() || 7;
        from.setDate(from.getDate() - dayOfWeek + 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - dayOfWeek + 7);
        to.setHours(23, 59, 59, 999);
    } else if (timeInterval === 'month') {
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setMonth(to.getMonth() + 1);
        to.setDate(0);
        to.setHours(23, 59, 59, 999);
    } else if (timeInterval === 'year') {
        from.setMonth(0);
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setMonth(12);
        to.setDate(0);
        to.setHours(23, 59, 59, 999);
    }

    return { from, to };
}

/**
 * Number of buckets a period is split into by the consumption chart
 *
 * @param interval - the selected period
 * @param from - first moment of the period, needed for the length of a month
 * @returns 24 for a day, 7 for a week, 28..31 for a month, 12 for a year
 */
export function getIntervalSteps(interval: string, from: Date): number {
    if (interval === 'year') {
        return 12;
    }
    if (interval === 'week') {
        return 7;
    }
    if (interval === 'month') {
        // `new Date(year, month + 1, 0)` is the last day of `month` (months are 0-based, day 0 is
        // "the day before the first"). Without the `+ 1` this returned the length of the PREVIOUS
        // month, so every February was drawn with 31 buckets and every March with 28.
        return new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
    }
    return 24;
}

/**
 * How many of a period fit into a month, used to spread a monthly base fee over the shown period
 *
 * @param interval - the selected period
 * @param from - first moment of the period
 * @returns Share of a month, e.g. ~1/30 for a day and 12 for a year
 */
export function getMonthFraction(interval: string, from: Date): number {
    const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
    if (interval === 'day') {
        return 1 / daysInMonth;
    }
    if (interval === 'week') {
        return 7 / daysInMonth;
    }
    if (interval === 'year') {
        return 12;
    }
    return 1;
}

/**
 * Read a number out of a state value, tolerating strings with a decimal comma
 *
 * @param value - raw state value
 * @returns The number, or null if the value cannot be read as one
 */
export function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    if (typeof value !== 'string') {
        return null;
    }
    // Some adapters store numbers as strings, and some of those use a decimal comma
    const parsed = parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * An `id` field of the attribute editor that was never touched arrives as the literal
 * string `nothing_selected`, so falsiness alone is not enough to detect "not configured".
 *
 * @param oid - value of an `id`/`hid` attribute
 * @returns The object ID, or an empty string if no object is selected
 */
export function cleanOid(oid: string | undefined | null): string {
    return !oid || oid === 'nothing_selected' ? '' : oid;
}

/**
 * Format a number with a fixed number of decimals, using the locale of the browser
 *
 * @param value - the number to format
 * @param decimals - how many decimals to show
 * @returns The formatted number, or `--` for a value that is not a number
 */
export function formatNumber(value: number | null | undefined, decimals = 1): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return '--';
    }
    return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Turn a duration into `1 h 05 min`, or `12 min` when it is shorter than an hour
 *
 * @param hours - the duration in hours
 * @returns The formatted duration, or null if it cannot be shown (infinite, negative, NaN)
 */
export function formatDuration(hours: number | null): string | null {
    if (hours === null || !Number.isFinite(hours) || hours < 0) {
        return null;
    }
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (!h) {
        return `${m} min`;
    }
    return `${h} h ${m.toString().padStart(2, '0')} min`;
}

/**
 * Describe a circular arc as an SVG path, used for the ring gauges
 *
 * @param cx - center x
 * @param cy - center y
 * @param radius - radius of the arc
 * @param startAngle - start angle in degrees, 0 is at 12 o'clock
 * @param endAngle - end angle in degrees, clockwise
 * @returns The `d` attribute of an SVG `path`
 */
export function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
    const polar = (angle: number): { x: number; y: number } => {
        const rad = ((angle - 90) * Math.PI) / 180;
        return {
            x: Math.round((cx + radius * Math.cos(rad)) * 100) / 100,
            y: Math.round((cy + radius * Math.sin(rad)) * 100) / 100,
        };
    };
    // A full circle cannot be drawn with a single arc - the start and the end point would be
    // identical and the browser draws nothing at all. Stop just short of it.
    const sweep = Math.min(Math.max(endAngle - startAngle, 0), 359.99);
    const start = polar(startAngle);
    const end = polar(startAngle + sweep);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}
