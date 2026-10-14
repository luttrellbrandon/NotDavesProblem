/**
 * Cloudflare Worker: serves /api/fact via Workers AI, otherwise static assets.
 * Free-plan friendly: small model, fail closed, client caches successes in localStorage.
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
			? 'Write one witty/snarky sentence that is still literally true.'
			: 'Write one plain, clear trivia sentence.';

	return [
		`State one well-known true fact about the integer ${n}.`,
		toneRule,
		'Prefer simple math properties (prime, square, factorial, factors) or famous cultural uses of that number.',
		'If you truly do not know a verified fact, reply with exactly: NONE',
		'Otherwise reply with ONLY the fact sentence — no JSON, no quotes, no preamble.'
	].join('\n');
}

function extractFact(raw: string): string | null {
	let text = raw.trim();
	if (!text) return null;

	// Strip common wrappers from small models.
	text = text.replace(/^```(?:json|text)?\s*/i, '').replace(/\s*```$/i, '').trim();
	if (/^none$/i.test(text) || /^null$/i.test(text)) return null;

	// Prefer JSON if the model still returns it.
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start !== -1 && end > start) {
		try {
			const parsed = JSON.parse(text.slice(start, end + 1)) as { fact?: unknown };
			if (parsed.fact === null || parsed.fact === undefined) return null;
			if (typeof parsed.fact === 'string') {
				const fact = parsed.fact.trim();
				if (!fact || /^(null|none|n\/a|unknown)$/i.test(fact)) return null;
				return sanitizeFact(fact);
			}
		} catch {
			// fall through to plain text
		}
	}

	// Plain sentence response.
	const line = text
		.split('\n')
		.map((l) => l.trim())
		.find((l) => l && !/^none$/i.test(l));
	if (!line) return null;
	return sanitizeFact(line);
}

function sanitizeFact(fact: string): string | null {
	const cleaned = fact
		.replace(/^["']|["']$/g, '')
		.replace(/^\s*fact\s*:\s*/i, '')
		.trim();
	if (!cleaned || cleaned.length < 8 || cleaned.length > 280) return null;
	if (/^(null|none|n\/a|unknown|i don't know|i do not know)/i.test(cleaned)) return null;
	return cleaned;
}

/** Accurate deterministic fallbacks when the model abstains. */
function mathFallback(n: number, tone: Tone): string | null {
	if (n === 0) {
		return tone === 'snarky'
			? 'Zero: the amount of overtime Dave still wants.'
			: '0 is the additive identity: adding it changes nothing.';
	}
	if (n === 1) {
		return tone === 'snarky'
			? '1 is the loneliest number — and also the multiplicative identity.'
			: '1 is the multiplicative identity: any number times 1 is itself.';
	}

	const isPrime = (x: number): boolean => {
		if (x < 2) return false;
		if (x % 2 === 0) return x === 2;
		for (let i = 3; i * i <= x; i += 2) {
			if (x % i === 0) return false;
		}
		return true;
	};

	const root = Math.sqrt(n);
	if (Number.isInteger(root)) {
		return tone === 'snarky'
			? `${n} is ${root}² — a perfect square, unlike most meetings.`
			: `${n} is a perfect square (${root} × ${root}).`;
	}

	if (isPrime(n)) {
		return tone === 'snarky'
			? `${n} is prime: indivisible, unlike the group chat.`
			: `${n} is a prime number: it has no positive divisors other than 1 and itself.`;
	}

	// Small factor pair for composites under a sane bound.
	if (n >= 2 && n <= 10_000) {
		for (let i = 2; i * i <= n; i++) {
			if (n % i === 0) {
				const other = n / i;
				return tone === 'snarky'
					? `${n} = ${i} × ${other}. At least the math has factors that make sense.`
					: `${n} equals ${i} × ${other}.`;
			}
		}
	}

	return null;
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

	// Keep n in a useful trivia range (blocks MAX_SAFE_INTEGER spam from huge Fun Measures).
	if (!Number.isInteger(n) || n < 0 || n > 1_000_000_000) {
		return json({ error: 'invalid_n' }, 400);
	}

	const tone = pickTone();
	const prompt = buildPrompt(n, tone);

	try {
		const result = await env.AI.run(MODEL, {
			messages: [
				{
					role: 'system',
					content: 'You are a concise trivia assistant. Prefer true, well-known facts. Never invent.'
				},
				{ role: 'user', content: prompt }
			],
			max_tokens: 120,
			temperature: 0.35
		});

		const text =
			typeof result === 'string'
				? result
				: result && typeof result === 'object' && 'response' in result
					? String((result as { response: unknown }).response)
					: JSON.stringify(result);

		const fromModel = extractFact(text);
		const fact = fromModel ?? mathFallback(n, tone);
		return json({ fact, tone } satisfies FactPayload);
	} catch (err) {
		console.error('Workers AI fact failed', err);
		const fact = mathFallback(n, tone);
		return json({ fact, tone, error: fact ? undefined : 'ai_unavailable' });
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
