# Number Facts via Numbers API Worker proxy

Number Facts come from the Numbers API trivia endpoint, fetched server-side by the same Worker that serves the site (`http://numbersapi.com/{n}/trivia` → same-origin `/api/fact`). The browser never calls Numbers API directly (HTTP-only / broken HTTPS). Workers AI is no longer used for facts (supersedes ADR 0005 for this purpose); the `AI` binding is removed from `wrangler.jsonc` until a future AI feature needs it. Client `localStorage` caching and same-origin request gating remain.
