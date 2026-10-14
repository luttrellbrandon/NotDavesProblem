# Not Dave's Problem

A single-page retirement countdown for **David Mangicaro**, hosted at [notdavesproblem.party](https://notdavesproblem.party).

The hero shows remaining time until the **Retirement Instant** (start of January 1, 2027, America/New_York), rotating through countdown views and Fun Measures with fade transitions. **Number Facts** come from the [Numbers API](http://numbersapi.com/) (trivia), proxied by a Cloudflare Worker over HTTPS and cached in `localStorage` ([ADR 0006](./docs/adr/0006-numbers-api-worker-proxy.md)). After the Retirement Instant, the site switches to a celebratory retired state.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) with `@sveltejs/adapter-static`
- Cloudflare Worker: static `build/` assets + `/api/fact` (Numbers API HTTP proxy)
- [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) **sunset** theme

## Domain language

Shared vocabulary lives in [`CONTEXT.md`](./CONTEXT.md). Architecture decisions live in [`docs/adr/`](./docs/adr/).

## Develop

```sh
npm install
npm run dev
```

Local `npm run dev` serves the SvelteKit app only. Fact calls to `/api/fact` need a deployed Worker or:

```sh
npm run build
npx wrangler dev
```

## Build / preview

```sh
npm run build
npm run preview
```

## Deploy (Cloudflare Workers Builds) — free

Deploys use **Cloudflare Workers Builds ↔ GitHub**. See [ADR 0004](./docs/adr/0004-cloudflare-pages-github.md) and `wrangler.jsonc`.

### How Number Facts work (no Workers AI)

1. Browser (HTTPS site) calls same-origin **`/api/fact?n=42`**.
2. Worker fetches **`http://numbersapi.com/42/trivia?json`** (HTTP is fine from the Worker).
3. Worker returns `{ fact, tone: "normal" }` over HTTPS.
4. Successful facts are stored in **`localStorage`** so repeat views don’t hit the API.

No AI enable step. No Neurons. Stay on **Workers Free**.

### Build settings

On **Workers & Pages** → **`notdavesproblem`** → **Settings** → **Build**:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npx vite build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22` |

Do **not** use `wrangler types --check` in the build command. `wrangler.jsonc` must name the Worker `notdavesproblem` and must **not** require an `AI` binding for facts.

### Verify

1. Push `main` and wait for a green deploy.
2. Open the site in a browser — facts should appear under the countdown when Numbers API has trivia for that integer.
3. `curl "https://YOUR_HOST/api/fact?n=42"` should return **403** (same-origin gating). DevTools on the site should show **200** for `/api/fact`.

### Branches

- **Production:** pushes / merges to `main` update the live site.
- **Previews:** non-`main` branches / PRs get preview uploads via Workers Builds.

### Custom domain: notdavesproblem.party

1. In the Worker project go to **Custom domains** → **Set up a domain**.
2. Add **`notdavesproblem.party`** (and `www` if you want it) and follow Cloudflare’s activation steps.
3. Keep DNS for that hostname on Cloudflare (proxied).

After activation, https://notdavesproblem.party should serve the latest `main` deploy.

## Out of scope (v1)

About sections, guestbook, gallery, and other tribute extras — see [ADR 0002](./docs/adr/0002-v1-single-page-hero.md).
