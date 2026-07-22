import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	getCenteredDateScrollLeft,
	padTimelineRangeForDefaultToday,
} from '../src/timeline-viewport';
import { formatCalendarDate, parseCalendarDateString } from '../src/timeline-date';

const d = (s: string) => parseCalendarDateString(s)!;

test('padTimelineRangeForDefaultToday adds leading space when the first item starts today', () => {
	const today = d('2026-07-22');
	const range = padTimelineRangeForDefaultToday(today, d('2026-08-20'), 'day', 'monday', today);

	assert.equal(formatCalendarDate(range.min), '2026-07-08');
	assert.equal(formatCalendarDate(range.max), '2026-08-20');
});

test('padTimelineRangeForDefaultToday includes today when all items are in the future', () => {
	const range = padTimelineRangeForDefaultToday(d('2026-09-01'), d('2026-09-12'), 'week', 'monday', d('2026-07-22'));

	assert.equal(formatCalendarDate(range.min), '2026-06-08');
	assert.equal(formatCalendarDate(range.max), '2026-09-13');
});

test('getCenteredDateScrollLeft centers target inside the non-frozen timeline area', () => {
	const scrollLeft = getCenteredDateScrollLeft({
		target: d('2026-07-22'),
		min: d('2026-07-08'),
		max: d('2026-08-05'),
		scrollWidth: 1200,
		clientWidth: 800,
		frozenWidth: 200,
	});

	assert.equal(scrollLeft, 200);
});

test('getCenteredDateScrollLeft clamps to the scrollable range', () => {
	const scrollLeft = getCenteredDateScrollLeft({
		target: d('2026-12-31'),
		min: d('2026-01-01'),
		max: d('2026-12-31'),
		scrollWidth: 1200,
		clientWidth: 800,
		frozenWidth: 200,
	});

	assert.equal(scrollLeft, 400);
});
