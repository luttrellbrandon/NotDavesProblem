import { readFactCache, writeFactCache, type CachedNumberFact } from '#lib/fact-cache';

export type NumberFactResult = CachedNumberFact;

/** Whole non-negative integer for fact API + cache keys. */
export function toFactInteger(value: number): number {
	if (!Number.isFinite(value)) return 0;
	const abs = Math.abs(value);
	if (abs < 1) return 0;
	return Math.min(Math.floor(abs), Number.MAX_SAFE_INTEGER);
}

/**
 * Load a Number Fact for n: localStorage first, then same-origin /api/fact.
 * Successful facts are cached forever. Nulls are not cached so a later view can retry.
 */
export async function loadNumberFact(n: number): Promise<NumberFactResult> {
	const cached = readFactCache(n);
	if (cached?.fact) return cached;

	try {
		const res = await fetch(`/api/fact?n=${encodeURIComponent(String(n))}`, {
			method: 'GET',
			credentials: 'same-origin',
			headers: { Accept: 'application/json' }
		});
		if (!res.ok) {
			return { fact: null, tone: 'normal' };
		}
		const data = (await res.json()) as { fact?: string | null; tone?: string };
		const entry: NumberFactResult = {
			fact: typeof data.fact === 'string' ? data.fact : null,
			tone: 'normal'
		};
		if (entry.fact) writeFactCache(n, entry);
		return entry;
	} catch {
		return { fact: null, tone: 'normal' };
	}
}
