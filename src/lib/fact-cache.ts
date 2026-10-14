export type CachedNumberFact = {
	fact: string | null;
	tone: 'normal';
};

/** Bump when fact source/semantics change (e.g. Numbers API → Useless Facts + AI). */
const PREFIX = 'ndp:fact:v5:';

function keyFor(n: number): string {
	return `${PREFIX}${n}`;
}

export function readFactCache(n: number): CachedNumberFact | undefined {
	if (typeof localStorage === 'undefined') return undefined;
	try {
		const raw = localStorage.getItem(keyFor(n));
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

export function writeFactCache(n: number, entry: CachedNumberFact): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(keyFor(n), JSON.stringify(entry));
	} catch {
		// Quota or private mode — ignore.
	}
}
