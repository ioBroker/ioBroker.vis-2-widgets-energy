export function getFromToTime(timeStart, timeInterval) {
    const from = new Date(timeStart || Date.now());
    const to = new Date(timeStart || Date.now());
    if (timeInterval === 'day') {
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
    } else if (timeInterval === 'week') {
        from.setDate(from.getDate() - from.getDay() + 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - to.getDay() + 7);
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
