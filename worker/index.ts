/**
 * Cloudflare Worker: serves /api/fact by proxying Numbers API (HTTP) over HTTPS,
 * otherwise static assets. Free Workers plan — no Workers AI required for facts.
 */

export interface Env {
	ASSETS: Fetcher;
}

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

async function handleFact(request: Request): Promise<Response> {
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
		// Numbers API is HTTP-only; Worker fetch avoids browser mixed-content / bad TLS.
		const upstream = await fetch(`http://numbersapi.com/${n}/trivia?json`, {
			headers: { Accept: 'application/json' }
		});

		if (!upstream.ok) {
			return json({ fact: null, tone: 'normal' } satisfies FactPayload);
		}

		const data = (await upstream.json()) as { text?: unknown; found?: unknown };
		const text = typeof data.text === 'string' ? data.text.trim() : '';
		const fact = text.length > 0 ? text : null;
		return json({ fact, tone: 'normal' } satisfies FactPayload);
	} catch (err) {
		console.error('Numbers API proxy failed', err);
		return json({ fact: null, tone: 'normal', error: 'upstream_unavailable' });
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/api/fact') {
			return handleFact(request);
		}

		return env.ASSETS.fetch(request);
	}
};
