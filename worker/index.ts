/**
 * Cloudflare Worker: serves /api/fact via Workers AI, otherwise static assets.
 * Free-plan friendly: small model, fail closed, client caches in localStorage.
 */

export interface Env {
	AI: Ai;
	ASSETS: Fetcher;
}

/** Small instruct model generally available on Workers Free. */
const MODEL = '@cf/meta/llama-3.2-3b-instruct';

type Tone = 'normal' | 'snarky';

type FactPayload = {
	fact: string | null;
	tone: Tone;
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}

function pickTone(): Tone {
	return Math.random() < 0.5 ? 'normal' : 'snarky';
}

function buildPrompt(n: number, tone: Tone): string {
	const toneRule =
		tone === 'snarky'
			? 'Tone: snarky and witty, but every claim must still be literally true.'
			: 'Tone: plain, friendly, encyclopedic.';

	return [
		'You are a careful trivia assistant.',
		`Give ONE short fact about the integer ${n}.`,
		toneRule,
		'Rules:',
		'- Only state a well-known, widely verified fact (math, science, history, culture).',
		'- Do not invent, guess, or exaggerate.',
		'- If you are not confident the fact is true and well-known, return null.',
		'- One or two sentences max. No markdown. No preface.',
		'Respond with ONLY valid JSON of the form {"fact":"..."} or {"fact":null}.'
	].join('\n');
}

function extractFact(raw: string): string | null {
	const trimmed = raw.trim();
	try {
		const start = trimmed.indexOf('{');
		const end = trimmed.lastIndexOf('}');
		if (start === -1 || end === -1) return null;
		const parsed = JSON.parse(trimmed.slice(start, end + 1)) as { fact?: unknown };
		if (parsed.fact === null || parsed.fact === undefined) return null;
		if (typeof parsed.fact !== 'string') return null;
		const fact = parsed.fact.trim();
		if (!fact || /^(null|none|n\/a|unknown)$/i.test(fact)) return null;
		return fact;
	} catch {
		return null;
	}
}

/**
 * Block casual off-site callers (curl, other websites).
 * Browsers sending same-origin fetches include Sec-Fetch-Site: same-origin.
 * This is abuse reduction, not cryptographic auth — headers can be spoofed.
 */
function isSiteBrowserRequest(request: Request): boolean {
	const url = new URL(request.url);
	const secFetchSite = request.headers.get('Sec-Fetch-Site');
	if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
		return true;
	}

	const origin = request.headers.get('Origin');
	if (origin) {
		try {
			return new URL(origin).host === url.host;
		} catch {
			return false;
		}
	}

	return false;
}

async function handleFact(request: Request, env: Env): Promise<Response> {
	// Only GET from the site — no CORS headers, so other origins cannot read responses in browsers.
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204 });
	}
	if (request.method !== 'GET') {
		return json({ error: 'method_not_allowed' }, 405);
	}
	if (!isSiteBrowserRequest(request)) {
		return json({ error: 'forbidden' }, 403);
	}

	const url = new URL(request.url);
	const nRaw = url.searchParams.get('n');
	const n = nRaw === null ? NaN : Number(nRaw);

	if (!Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) {
		return json({ error: 'invalid_n' }, 400);
	}

	const tone = pickTone();
	const prompt = buildPrompt(n, tone);

	try {
		const result = await env.AI.run(MODEL, {
			messages: [
				{ role: 'system', content: 'You only output JSON as instructed.' },
				{ role: 'user', content: prompt }
			],
			max_tokens: 180,
			temperature: 0.2
		});

		const text =
			typeof result === 'string'
				? result
				: result && typeof result === 'object' && 'response' in result
					? String((result as { response: unknown }).response)
					: JSON.stringify(result);

		const fact = extractFact(text);
		const payload: FactPayload = { fact, tone };
		return json(payload);
	} catch (err) {
		console.error('Workers AI fact failed', err);
		return json({ fact: null, tone, error: 'ai_unavailable' } satisfies FactPayload & {
			error: string;
		});
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/api/fact') {
			return handleFact(request, env);
		}

		return env.ASSETS.fetch(request);
	}
};
