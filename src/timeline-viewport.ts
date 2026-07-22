import { addCalendarDays, localMidnight } from './timeline-date';
import { snapEndToScale, snapStartToScale, type TimeScale, type WeekStart } from './timeline-axis';

const DEFAULT_TODAY_PADDING_BY_SCALE: Record<TimeScale, number> = {
	day: 14,
	week: 42,
	month: 180,
	quarter: 270,
	year: 730,
};

export interface CenteredDateScrollInput {
	target: Date;
	min: Date;
	max: Date;
	scrollWidth: number;
	clientWidth: number;
	frozenWidth: number;
}

export function getCenteredDateScrollLeft(input: CenteredDateScrollInput): number | null {
	const total = input.max.getTime() - input.min.getTime();
	if (total <= 0) return null;

	const visibleTimelineWidth = Math.max(0, input.clientWidth - input.frozenWidth);
	const trackWidth = Math.max(0, input.scrollWidth - input.frozenWidth);
	const ratio = (input.target.getTime() - input.min.getTime()) / total;
	const desired = ratio * trackWidth - visibleTimelineWidth / 2;
	const maxScrollLeft = Math.max(0, input.scrollWidth - input.clientWidth);
	return Math.min(maxScrollLeft, Math.max(0, desired));
}

export function padTimelineRangeForDefaultToday(
	min: Date,
	max: Date,
	timeScale: TimeScale,
	weekStart: WeekStart,
	todayInput: Date = new Date(),
): { min: Date; max: Date } {
	const today = localMidnight(todayInput);
	const paddingDays = DEFAULT_TODAY_PADDING_BY_SCALE[timeScale];
	const paddedTodayMin = snapStartToScale(addCalendarDays(today, -paddingDays), timeScale, weekStart);
	const paddedTodayMax = snapEndToScale(addCalendarDays(today, paddingDays), timeScale, weekStart);
	const snappedMin = snapStartToScale(min, timeScale, weekStart);
	const snappedMax = snapEndToScale(max, timeScale, weekStart);

	return {
		min: paddedTodayMin < snappedMin ? paddedTodayMin : snappedMin,
		max: paddedTodayMax > snappedMax ? paddedTodayMax : snappedMax,
	};
}
