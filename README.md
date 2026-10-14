# Not Dave's Problem

A single-page retirement countdown for **David Mangicaro**, hosted at [notdavesproblem.party](https://notdavesproblem.party).

The hero shows remaining time until the **Retirement Instant** (start of January 1, 2027, America/New_York), rotating through countdown views with fade transitions. After that instant, the site switches to a celebratory retired state. **Number Facts** are deferred until an HTTPS-capable trivia source is chosen ([ADR 0003](./docs/adr/0003-defer-number-facts.md)).

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) with `@sveltejs/adapter-static` (Cloudflare Pages / static hosting)
- [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) **sunset** theme

## Domain language

Shared vocabulary lives in [`CONTEXT.md`](./CONTEXT.md). Architecture decisions live in [`docs/adr/`](./docs/adr/).

## Develop

```sh
npm install
npm run dev
```

## Build / preview

```sh
npm run build
npm run preview
```

## Deploy (Cloudflare Workers Builds)

Deploys use **Cloudflare Workers Builds ↔ GitHub** with static assets (not GitHub Actions). See [ADR 0004](./docs/adr/0004-cloudflare-pages-github.md) and `wrangler.jsonc`.

### Dashboard build settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npx vite build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22` |

`wrangler.jsonc` names the Worker `notdavesproblem` and publishes `./build` as assets (from `adapter-static`).

### Branches

- **Production:** pushes / merges to `main` update the live site.
- **Previews:** non-`main` branches / PRs get preview uploads via Workers Builds.

### Custom domain: notdavesproblem.party

1. In the Worker/Pages project go to **Custom domains** → **Set up a domain**.
2. Add **`notdavesproblem.party`** (and `www` if you want it) and follow Cloudflare’s activation steps.
3. Keep DNS for that hostname on Cloudflare (proxied).

After activation, https://notdavesproblem.party should serve the latest `main` deploy.

## Out of scope (v1)

About sections, guestbook, gallery, and other tribute extras — see [ADR 0002](./docs/adr/0002-v1-single-page-hero.md).
