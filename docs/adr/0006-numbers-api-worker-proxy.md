# Number Facts via Numbers API Worker proxy

**Status:** superseded by [ADR 0007](./0007-useless-facts-ai-rewrite.md)

Number Facts briefly came from the Numbers API trivia endpoint, fetched server-side by the same Worker (`http://numbersapi.com/{n}/trivia` → same-origin `/api/fact`). Numbers API became unavailable (HTTP 404 / broken HTTPS), so facts moved to Useless Facts + Workers AI rewrite.
