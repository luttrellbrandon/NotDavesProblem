import {
	FUN_MEASURE_IDS,
	getFunMeasureCountdownUnit,
	isFunMeasureId,
	type FunMeasureId
} from '#lib/fun-measures';

export type CountdownViewId = 'full' | 'days' | 'hours' | 'minutes' | 'seconds' | 'weeks';

export type HeroViewId = CountdownViewId | FunMeasureId;

export const COUNTDOWN_VIEWS: readonly CountdownViewId[] = [
	'full',
	'days',
	'hours',
	'minutes',
	'seconds',
	'weeks'
] as const;

/** Full hero rotation: real clock views, then Fun Measures. */
export const HERO_VIEWS: readonly HeroViewId[] = [...COUNTDOWN_VIEWS, ...FUN_MEASURE_IDS];

export type RemainingBreakdown = {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	totalDays: number;
	totalHours: number;
	totalMinutes: number;
	totalSeconds: number;
	totalWeeks: number;
	isRetired: boolean;
};

const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;

export function getRemaining(nowMs: number, targetMs: number): RemainingBreakdown {
	const diff = targetMs - nowMs;

	if (diff <= 0) {
		return {
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
			totalDays: 0,
			totalHours: 0,
			totalMinutes: 0,
			totalSeconds: 0,
			totalWeeks: 0,
			isRetired: true
		};
	}

	const totalSeconds = Math.floor(diff / MS_SECOND);
	const totalMinutes = Math.floor(diff / MS_MINUTE);
	const totalHours = Math.floor(diff / MS_HOUR);
	const totalDays = Math.floor(diff / MS_DAY);
	const totalWeeks = Math.floor(diff / MS_WEEK);

	const days = totalDays;
	const hours = Math.floor((diff % MS_DAY) / MS_HOUR);
	const minutes = Math.floor((diff % MS_HOUR) / MS_MINUTE);
	const seconds = Math.floor((diff % MS_MINUTE) / MS_SECOND);

	return {
		days,
		hours,
		minutes,
		seconds,
		totalDays,
		totalHours,
		totalMinutes,
		totalSeconds,
		totalWeeks,
		isRetired: false
	};
}

export function getPrimaryNumber(
	view: CountdownViewId,
	remaining: RemainingBreakdown
): number {
	switch (view) {
		case 'full':
		case 'days':
			return remaining.totalDays;
		case 'hours':
			return remaining.totalHours;
		case 'minutes':
			return remaining.totalMinutes;
		case 'seconds':
			return remaining.totalSeconds;
		case 'weeks':
			return remaining.totalWeeks;
	}
}

export function getViewLabel(view: CountdownViewId): string {
	switch (view) {
		case 'full':
			return 'until retirement';
		case 'days':
			return 'days';
		case 'hours':
			return 'hours';
		case 'minutes':
			return 'minutes';
		case 'seconds':
			return 'seconds';
		case 'weeks':
			return 'weeks';
	}
}

/** Countdown Unit for Number Facts (Full Clock → days; Fun Measures → fixed gag phrase). */
export function getCountdownUnit(view: HeroViewId): string {
	if (isFunMeasureId(view)) {
		return getFunMeasureCountdownUnit(view);
	}
	if (view === 'full') return 'days';
	return getViewLabel(view);
}
