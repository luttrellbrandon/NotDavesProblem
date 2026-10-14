/**
 * Cloudflare Worker: serves /api/fact by fetching a random Useless Fact,
 * rewriting it with Workers AI into a retirement joke that includes n,
 * otherwise static assets.
 */

export interface Env {
	AI: Ai;
	ASSETS: Fetcher;
}

/** Small instruct model generally available on Workers Free. */
const MODEL = '@cf/meta/llama-3.2-3b-instruct';

const USELESS_FACTS_URL =
	'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en';

type FactPayload = {
	fact: string | null;
	tone: 'normal';
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

/**
 * Block casual off-site callers (curl, other websites).
 * Abuse reduction, not cryptographic auth — headers can be spoofed.
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

function buildPrompt(n: number, sourceFact: string): string {
	return [
		`Countdown number: ${n}`,
		`Source trivia (true, do not invent new claims): ${sourceFact}`,
		'',
		'Write ONE short retirement joke (1–2 sentences) that weaves in BOTH:',
		`- the countdown number ${n} (digits must appear), and`,
		'- the idea from the source trivia above.',
		'Light retirement / countdown vibe for a coworker named Dave.',
		'Do not invent new factual claims beyond the source trivia.',
		'No JSON, no quotes wrapper, no preamble — only the joke text.',
		'If you cannot do that, reply with exactly: NONE'
	].join('\n');
}

function extractJoke(raw: string, n: number): string | null {
	let text = raw.trim();
	if (!text) return null;

	text = text.replace(/^```(?:json|text)?\s*/i, '').replace(/\s*```$/i, '').trim();
	if (/^none$/i.test(text) || /^null$/i.test(text)) return null;

	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start !== -1 && end > start) {
		try {
			const parsed = JSON.parse(text.slice(start, end + 1)) as { fact?: unknown };
			if (typeof parsed.fact === 'string') {
				return sanitizeJoke(parsed.fact, n);
			}
		} catch {
			// fall through
		}
	}

	const line = text
		.split('\n')
		.map((l) => l.trim())
		.find((l) => l && !/^none$/i.test(l));
	if (!line) return null;
	return sanitizeJoke(line, n);
}

function sanitizeJoke(fact: string, n: number): string | null {
	const cleaned = fact
		.replace(/^["']|["']$/g, '')
		.replace(/^\s*(fact|joke)\s*:\s*/i, '')
		.trim();
	if (!cleaned || cleaned.length < 12 || cleaned.length > 320) return null;
	if (/^(null|none|n\/a|unknown|i don't know|i do not know)/i.test(cleaned)) return null;
	// Must include the countdown digits so the number is woven in.
	if (!cleaned.includes(String(n))) return null;
	return cleaned;
}

async function fetchUselessFact(): Promise<string | null> {
	const upstream = await fetch(USELESS_FACTS_URL, {
		headers: { Accept: 'application/json' }
	});
	if (!upstream.ok) return null;

	const data = (await upstream.json()) as { text?: unknown };
	const text = typeof data.text === 'string' ? data.text.trim() : '';
	return text.length > 0 ? text : null;
}

async function rewriteWithAi(env: Env, n: number, sourceFact: string): Promise<string | null> {
	const result = await env.AI.run(MODEL, {
		messages: [
			{
				role: 'system',
				content:
					'You rewrite true trivia into short, clean retirement countdown jokes. Never invent new factual claims. Always include the given countdown number.'
			},
			{ role: 'user', content: buildPrompt(n, sourceFact) }
		],
		max_tokens: 160,
		temperature: 0.7
	});

	const text =
		typeof result === 'string'
			? result
			: result && typeof result === 'object' && 'response' in result
				? String((result as { response: unknown }).response)
				: JSON.stringify(result);

	return extractJoke(text, n);
}

async function handleFact(request: Request, env: Env): Promise<Response> {
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

	if (!Number.isInteger(n) || n < 0 || n > 1_000_000_000) {
		return json({ error: 'invalid_n' }, 400);
	}

	try {
		const sourceFact = await fetchUselessFact();
		if (!sourceFact) {
			return json({ fact: null, tone: 'normal' } satisfies FactPayload);
		}

		const fact = await rewriteWithAi(env, n, sourceFact);
		return json({ fact, tone: 'normal' } satisfies FactPayload);
	} catch (err) {
		console.error('Useless Facts + AI rewrite failed', err);
		return json({ fact: null, tone: 'normal', error: 'upstream_unavailable' });
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
