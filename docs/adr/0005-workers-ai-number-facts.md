# Number Facts via Workers AI on the same Worker

**Status:** superseded by [ADR 0007](./0007-useless-facts-ai-rewrite.md) (via [ADR 0006](./0006-numbers-api-worker-proxy.md))

Number Facts briefly used Cloudflare Workers AI alone to invent trivia about `n`. That was replaced by a Numbers API proxy, then by Useless Facts + AI rewrite so the model grounds jokes in real upstream trivia.
