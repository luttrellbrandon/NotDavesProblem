export type CachedNumberFact = {
	fact: string | null;
	tone: 'normal';
};

/** Bump when fact source/semantics change (e.g. n-only → n+Countdown Unit). */
const PREFIX = 'ndp:fact:v6:';

function keyFor(n: number, unit: string): string {
	return `${PREFIX}${n}:${unit}`;
}

export function readFactCache(n: number, unit: string): CachedNumberFact | undefined {
	if (typeof localStorage === 'undefined') return undefined;
	try {
		const raw = localStorage.getItem(keyFor(n, unit));
		if (!raw) return undefined;
		const parsed = JSON.parse(raw) as CachedNumberFact;
		if (parsed && (typeof parsed.fact === 'string' || parsed.fact === null)) {
			return parsed;
		}
		return undefined;
	} catch {
		return undefined;
	}
}

export function writeFactCache(n: number, unit: string, entry: CachedNumberFact): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(keyFor(n, unit), JSON.stringify(entry));
	} catch {
		// Quota or private mode — ignore.
	}
}
