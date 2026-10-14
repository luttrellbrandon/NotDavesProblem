import type { RemainingBreakdown } from '#lib/countdown';

/** Fun Measure ids in display order (after the real clock Countdown Views). */
export const FUN_MEASURE_IDS = [
	'martian-sols',
	'moon-cycles',
	'earth-rotations',
	'solar-orbits',
	'jupiter-years',
	'light-seconds',
	'galactic-years',
	'pluto-days',
	'atomic-ticks',
	'klingon-cycles',
	'stardate',
	'minecraft-days',
	'tatooine-sunsets',
	'coffee-refills',
	'remaining-mondays',
	'meetings',
	'teams-notifications',
	'cares-left'
] as const;

export type FunMeasureId = (typeof FUN_MEASURE_IDS)[number];

export type FunMeasurePresentation = {
	id: FunMeasureId;
	/** Large headline value (already formatted). */
	primary: string;
	/** Funny sentence with live values filled in. */
	sentence: string;
	/** Whole integer for Number Fact fetch/cache. */
	factInteger: number;
};

function factInt(value: number): number {
	if (!Number.isFinite(value)) return 0;
	const abs = Math.abs(value);
	if (abs < 1) return 0;
	return Math.min(Math.floor(abs), Number.MAX_SAFE_INTEGER);
}

const MS_SECOND = 1000;
const MS_DAY = 86_400_000;

/** Mean Martian solar day (sol). */
const MARTIAN_SOL_MS = 88_775_244.147;
/** Synodic month (new moon to new moon). */
const SYNODIC_MONTH_DAYS = 29.530588;
/** Tropical year. */
const YEAR_DAYS = 365.24219;
/** Jupiter sidereal orbital period (years). */
const JUPITER_ORBIT_YEARS = 11.862;
/** Rough Milky Way galactic year. */
const GALACTIC_YEAR_YEARS = 230_000_000;
/** Pluto sidereal rotation period (Earth days). */
const PLUTO_DAY_DAYS = 6.3872;
/** Cs-133 hyperfine frequency (SI second definition). */
const CESIUM_HZ = 9_192_631_770;
/** Speed of light (km/s). */
const C_KM_PER_S = 299_792.458;
/** Minecraft day length. */
const MINECRAFT_DAY_MS = 20 * 60 * 1000;
/**
 * Invented Klingon "battle cycle" length so the joke tracks remaining time.
 * (~1.66 Earth days -> ~47 cycles near ~78 Earth days.)
 */
const KLINGON_BATTLE_CYCLE_MS = 1.66 * MS_DAY;
/** Gag rates (workplace). */
const COFFEE_PER_DAY = 1.615;
const MEETINGS_PER_DAY = 0.47;
const TEAMS_PINGS_PER_DAY = 54;

export function isFunMeasureId(id: string): id is FunMeasureId {
	return (FUN_MEASURE_IDS as readonly string[]).includes(id);
}

function formatDecimal(value: number, digits: number): string {
	if (!Number.isFinite(value) || value <= 0) return (0).toFixed(Math.min(digits, 1));
	return value.toLocaleString('en-US', {
		maximumFractionDigits: digits,
		minimumFractionDigits: 0
	});
}

function formatInt(value: number): string {
	return Math.max(0, Math.floor(value)).toLocaleString('en-US');
}

function formatScientific(value: number, digits = 2): string {
	if (!Number.isFinite(value) || value <= 0) return '0';
	return value.toExponential(digits).replace('e+', ' × 10^').replace('e-', ' × 10^-');
}

function formatDistanceKm(km: number): string {
	if (km >= 1e12) return `${formatDecimal(km / 1e12, 2)} trillion km`;
	if (km >= 1e9) return `${formatDecimal(km / 1e9, 2)} billion km`;
	if (km >= 1e6) return `${formatDecimal(km / 1e6, 2)} million km`;
	return `${formatInt(km)} km`;
}

/** Count Mondays in America/New_York that still occur before the Retirement Instant. */
export function countRemainingMondays(nowMs: number, targetMs: number): number {
	if (targetMs <= nowMs) return 0;

	let count = 0;
	let cursor = nowMs;
	const guard = 400;

	for (let i = 0; i < guard && cursor < targetMs; i++) {
		const weekday = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/New_York',
			weekday: 'short'
		}).format(new Date(cursor));

		if (weekday === 'Mon') count += 1;
		cursor += MS_DAY;
	}

	return count;
}

export function getFunMeasure(
	id: FunMeasureId,
	remaining: RemainingBreakdown,
	nowMs: number,
	targetMs: number
): FunMeasurePresentation {
	const diffMs = Math.max(0, targetMs - nowMs);
	const dayFraction = diffMs / MS_DAY;
	const years = dayFraction / YEAR_DAYS;

	switch (id) {
		case 'martian-sols': {
			const sols = diffMs / MARTIAN_SOL_MS;
			return {
				id,
				primary: formatDecimal(sols, 1),
				sentence: `Dave retires in ${formatDecimal(sols, 1)} Martian days`,
				factInteger: factInt(sols)
			};
		}
		case 'moon-cycles': {
			const cycles = dayFraction / SYNODIC_MONTH_DAYS;
			return {
				id,
				primary: formatDecimal(cycles, 1),
				sentence: `Only ${formatDecimal(cycles, 1)} full lunar cycles until freedom`,
				factInteger: factInt(cycles)
			};
		}
		case 'earth-rotations': {
			const spins = remaining.totalDays;
			return {
				id,
				primary: formatInt(spins),
				sentence: `${formatInt(spins)} more spins of this stupid planet`,
				factInteger: factInt(spins)
			};
		}
		case 'solar-orbits': {
			return {
				id,
				primary: formatDecimal(years, 3),
				sentence: `${formatDecimal(years, 3)} trips around the Sun remaining`,
				factInteger: factInt(years)
			};
		}
		case 'jupiter-years': {
			const jYears = years / JUPITER_ORBIT_YEARS;
			return {
				id,
				primary: formatDecimal(jYears, 4),
				sentence: `${formatDecimal(jYears, 4)} Jupiter years until escape`,
				factInteger: factInt(jYears)
			};
		}
		case 'light-seconds': {
			const lightSeconds = remaining.totalSeconds;
			const km = lightSeconds * C_KM_PER_S;
			return {
				id,
				primary: formatInt(lightSeconds),
				sentence: `Light could travel ${formatDistanceKm(km)} before Dave retires`,
				factInteger: factInt(lightSeconds)
			};
		}
		case 'galactic-years': {
			const gYears = years / GALACTIC_YEAR_YEARS;
			return {
				id,
				primary: formatScientific(gYears, 2),
				sentence: `${formatScientific(gYears, 2)} galactic years remaining`,
				factInteger: factInt(gYears)
			};
		}
		case 'pluto-days': {
			const plutoDays = dayFraction / PLUTO_DAY_DAYS;
			return {
				id,
				primary: formatDecimal(plutoDays, 1),
				sentence: `Only ${formatDecimal(plutoDays, 1)} Pluto days until freedom`,
				factInteger: factInt(plutoDays)
			};
		}
		case 'atomic-ticks': {
			const ticks = (diffMs / MS_SECOND) * CESIUM_HZ;
			return {
				id,
				primary: formatScientific(ticks, 1),
				sentence: `Approximately ${formatScientific(ticks, 1)} cesium oscillations to go`,
				factInteger: factInt(ticks)
			};
		}
		case 'klingon-cycles': {
			const cycles = diffMs / KLINGON_BATTLE_CYCLE_MS;
			return {
				id,
				primary: formatInt(cycles),
				sentence: `${formatInt(cycles)} Klingon battle cycles until honorable discharge`,
				factInteger: factInt(cycles)
			};
		}
		case 'stardate': {
			return {
				id,
				primary: '404',
				sentence: 'Stardate 404: Employment Not Found',
				factInteger: 404
			};
		}
		case 'minecraft-days': {
			const mcDays = diffMs / MINECRAFT_DAY_MS;
			return {
				id,
				primary: formatInt(mcDays),
				sentence: `${formatInt(mcDays)} Minecraft days until retirement`,
				factInteger: factInt(mcDays)
			};
		}
		case 'tatooine-sunsets': {
			const sunsets = remaining.totalDays;
			return {
				id,
				primary: formatInt(sunsets),
				sentence: `${formatInt(sunsets)} sunsets until Dave escapes the Empire`,
				factInteger: factInt(sunsets)
			};
		}
		case 'coffee-refills': {
			const cups = dayFraction * COFFEE_PER_DAY;
			return {
				id,
				primary: formatInt(cups),
				sentence: `Only ${formatInt(cups)} cups of coffee until freedom`,
				factInteger: factInt(cups)
			};
		}
		case 'remaining-mondays': {
			const mondays = countRemainingMondays(nowMs, targetMs);
			return {
				id,
				primary: formatInt(mondays),
				sentence: `Just ${formatInt(mondays)} more Mondays to survive`,
				factInteger: factInt(mondays)
			};
		}
		case 'meetings': {
			const meetings = dayFraction * MEETINGS_PER_DAY;
			return {
				id,
				primary: formatInt(meetings),
				sentence: `${formatInt(meetings)} pointless meetings remaining`,
				factInteger: factInt(meetings)
			};
		}
		case 'teams-notifications': {
			const pings = dayFraction * TEAMS_PINGS_PER_DAY;
			return {
				id,
				primary: formatInt(pings),
				sentence: `Approximately ${formatInt(pings)} interruptions remaining`,
				factInteger: factInt(pings)
			};
		}
		case 'cares-left': {
			const cares = Math.max(1e-10, diffMs / 1e20);
			const primary = cares.toExponential(1);
			return {
				id,
				primary,
				sentence: `${primary} cares left to give — and declining`,
				factInteger: factInt(cares)
			};
		}
	}
}
