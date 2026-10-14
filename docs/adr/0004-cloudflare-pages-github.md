# Deploy via Cloudflare Workers Builds (static assets)

Production deploys come from Cloudflare Workers Builds connected to the GitHub repo, not from a GitHub Actions deploy workflow. Cloudflare runs `npx vite build` (writes `build/` via `adapter-static`), then `npx wrangler deploy` using `wrangler.jsonc` assets from `./build`. Pull requests get preview deployments. The production hostname is **notdavesproblem.party**. GitHub Actions was rejected to keep the pipeline simpler for a static site.
