/**
 * Cloudflare Worker: serves /api/fact via Workers AI, otherwise static assets.
 * Free-plan friendly: cultural trivia, fail closed, client caches successes.
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
			? 'Tone: witty or snarky, but every claim must still be literally true.'
			: 'Tone: plain, clear, and interesting.';

	return [
		`Give ONE short, well-known trivia fact about the integer ${n}.`,
		toneRule,
		'Content rules:',
		'- Prefer history, culture, sports, science, geography, technology, or famous named uses of this number.',
		'- Examples of good directions: a famous year, jersey number, atomic number, highway, constellation, product, event — only if truly associated with this number.',
		'- Do NOT say it is prime, composite, even, odd, square, triangular, factorial, or list factors/divisibility.',
		'- Do NOT invent or guess. If you do not know a verified non-math trivia fact, reply with exactly: NONE',
		'- One or two sentences max. No JSON, no quotes, no preamble — only the fact sentence or NONE.'
	].join('\n');
}

/** Reject bare math-classification trivia. */
function isDullMathFact(fact: string): boolean {
	const f = fact.toLowerCase();
	const dullPatterns = [
		/\bprime number\b/,
		/\bis prime\b/,
		/\bcomposite number\b/,
		/\bis composite\b/,
		/\bperfect square\b/,
		/\bsquare number\b/,
		/\btriangular number\b/,
		/\bfactorial\b/,
		/\bdivisible by\b/,
		/\bdivisor(s)?\b/,
		/\bfactor(s)?\b/,
		/\beven number\b/,
		/\bodd number\b/,
		/\badditive identity\b/,
		/\bmultiplicative identity\b/,
		/\bequals \d+\s*[×x*]\s*\d+/,
		/\bis \d+\s*[×x*]\s*\d+/
	];
	return dullPatterns.some((re) => re.test(f));
}

function extractFact(raw: string): string | null {
	let text = raw.trim();
	if (!text) return null;

	text = text.replace(/^```(?:json|text)?\s*/i, '').replace(/\s*```$/i, '').trim();
	if (/^none$/i.test(text) || /^null$/i.test(text)) return null;

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
			// fall through
		}
	}

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
	if (isDullMathFact(cleaned)) return null;
	return cleaned;
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

	const tone = pickTone();
	const prompt = buildPrompt(n, tone);

	try {
		const result = await env.AI.run(MODEL, {
			messages: [
				{
					role: 'system',
					content:
						'You are a trivia assistant for interesting real-world facts about numbers. Never invent. Never answer with only math classifications (prime, factors, even/odd, squares).'
				},
				{ role: 'user', content: prompt }
			],
			max_tokens: 140,
			temperature: 0.4
		});

		const text =
			typeof result === 'string'
				? result
				: result && typeof result === 'object' && 'response' in result
					? String((result as { response: unknown }).response)
					: JSON.stringify(result);

		const fact = extractFact(text);
		return json({ fact, tone } satisfies FactPayload);
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
