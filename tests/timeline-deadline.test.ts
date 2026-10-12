import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getDeadlineWarningRange } from '../src/timeline-deadline';
import { formatCalendarDate } from '../src/timeline-date';

const range = (deadline: string, scale: string, weekStart: 'monday' | 'sunday' = 'monday') => {
	const [y, m, d] = deadline.split('-').map(Number);
	const result = getDeadlineWarningRange(new Date(y, m - 1, d), scale, weekStart);
	return [result.start, result.peakStart, result.end].map(formatCalendarDate);
};

test('day view leads in over the week before the deadline day', () => {
	assert.deepEqual(range('2026-10-20', 'day'), ['2026-10-13', '2026-10-20', '2026-10-21']);
});

test('week view leads in over a month and peaks on the deadline week', () => {
	// 2026-10-22 is a Thursday.
	assert.deepEqual(range('2026-10-22', 'week'), ['2026-09-19', '2026-10-19', '2026-10-26']);
	assert.deepEqual(range('2026-10-22', 'week', 'sunday'), ['2026-09-18', '2026-10-18', '2026-10-25']);
});

test('month, quarter and year views lead in over a quarter, a year and three years', () => {
	assert.deepEqual(range('2026-10-22', 'month'), ['2026-07-01', '2026-10-01', '2026-11-01']);
	assert.deepEqual(range('2026-11-22', 'quarter'), ['2025-10-01', '2026-10-01', '2027-01-01']);
	assert.deepEqual(range('2026-11-22', 'year'), ['2023-01-01', '2026-01-01', '2027-01-01']);
});

test('month subtraction clamps to the last day of a shorter month', () => {
	// Week of Monday 2026-03-30; one month earlier has no 30th.
	assert.deepEqual(range('2026-03-31', 'week'), ['2026-02-28', '2026-03-30', '2026-04-06']);
});
