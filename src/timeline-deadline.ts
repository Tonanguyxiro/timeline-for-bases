import { addCalendarDays } from './timeline-date';
import { snapEndToScale, snapStartToScale, WeekStart } from './timeline-axis';

export interface DeadlineWarningRange {
	/** Where the background starts fading in. */
	start: Date;
	/** Start of the deadline's own day/week/month/…, where full intensity is reached. */
	peakStart: Date;
	/** Exclusive end of the deadline's bucket. */
	end: Date;
}

function subtractCalendarMonths(date: Date, months: number): Date {
	const result = new Date(date.getFullYear(), date.getMonth() - months, 1);
	const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
	result.setDate(Math.min(date.getDate(), lastDay));
	return result;
}

/** Range over which a row's background warms up towards its deadline.
 *
 *  The warning leads in over the next larger unit than the scale — a week in
 *  day view, a month in week view, a quarter in month view, a year in quarter
 *  view, three years in year view — and peaks on the deadline's own bucket. */
export function getDeadlineWarningRange(deadline: Date, scale: string, weekStart: WeekStart = 'monday'): DeadlineWarningRange {
	const peakStart = snapStartToScale(deadline, scale, weekStart);
	const end = addCalendarDays(snapEndToScale(deadline, scale, weekStart), 1);
	let start: Date;
	if (scale === 'week') start = subtractCalendarMonths(peakStart, 1);
	else if (scale === 'month') start = subtractCalendarMonths(peakStart, 3);
	else if (scale === 'quarter') start = subtractCalendarMonths(peakStart, 12);
	else if (scale === 'year') start = subtractCalendarMonths(peakStart, 36);
	else start = addCalendarDays(peakStart, -7);
	return { start, peakStart, end };
}
