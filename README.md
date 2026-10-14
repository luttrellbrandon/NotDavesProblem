# Not Dave's Problem

A single-page retirement countdown for **David Mangicaro**, hosted at [notdavesproblem.party](https://notdavesproblem.party).

The hero shows remaining time until the **Retirement Instant** (start of January 1, 2027, America/New_York), rotating through countdown views and Fun Measures with fade transitions. **Number Facts** come from [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) (normal or snarky tone), cached in `localStorage` ([ADR 0005](./docs/adr/0005-workers-ai-number-facts.md)). After the Retirement Instant, the site switches to a celebratory retired state.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) with `@sveltejs/adapter-static`
- Cloudflare Worker: static `build/` assets + `/api/fact` (Workers AI)
- [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) **sunset** theme

## Domain language

Shared vocabulary lives in [`CONTEXT.md`](./CONTEXT.md). Architecture decisions live in [`docs/adr/`](./docs/adr/).

## Develop

```sh
npm install
npm run dev
```

Local `npm run dev` serves the SvelteKit app only (no Workers AI). Fact calls to `/api/fact` need a deployed Worker or `wrangler dev` after a build.

```sh
npm run build
npx wrangler dev
```

## Build / preview

```sh
npm run build
npm run preview
```

## Deploy (Cloudflare Workers Builds)

Deploys use **Cloudflare Workers Builds ↔ GitHub** (not GitHub Actions). See [ADR 0004](./docs/adr/0004-cloudflare-pages-github.md) and `wrangler.jsonc`.

### One-time Cloudflare setup (Workers AI) — free plan

Do this **before** (or right after) the first deploy that includes the `AI` binding.

#### A. Account / Workers AI

1. Log in at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Stay on **Workers Free** unless you intentionally upgrade. Free includes **10,000 Neurons/day** for Workers AI ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)).
3. Open **AI** → **Workers AI** in the sidebar (or search “Workers AI”).
4. If Cloudflare shows a welcome / terms / “Get started” prompt, accept it so AI is enabled for the account.
5. You do **not** create a public API token for the website. The site uses a private **`AI` binding** in `wrangler.jsonc` (no key in the browser).

#### B. Build settings (avoid broken builds)

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

Do **not** use `wrangler types --check` in the build command. Do **not** point Deploy at a different project name than `notdavesproblem` in `wrangler.jsonc`.

#### C. Deploy the AI-enabled code

1. Push `main` with `wrangler.jsonc` (`ai.binding`, `main`, `assets`) and `worker/index.ts`.
2. Wait for the Git-connected build + deploy to go green.
3. If deploy fails mentioning AI / binding permissions, return to **AI → Workers AI**, finish any enable prompts, and **Retry deploy**.

#### D. Verify (site OK, outsiders blocked)

1. Open the live site (custom domain or `*.workers.dev`) **in a browser**. Wait for a Countdown View — a fact may appear, or stay blank if the model fail-closes.
2. From a terminal, `curl "https://YOUR_HOST/api/fact?n=42"` should return **403** (blocked). That is intentional.
3. DevTools → Network on the site should show `/api/fact` returning **200** JSON from the same origin.

`/api/fact` only accepts same-origin browser requests (`Sec-Fetch-Site` / matching `Origin`). There are **no CORS allow headers**, so other websites cannot read the response in a browser. Determined callers can still spoof headers; `localStorage` caching keeps Neuron use low for real visitors.


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
