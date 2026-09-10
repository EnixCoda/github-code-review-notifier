# GitHub webhook filter (Cloudflare Worker)

Edge filter that sits in front of the Vercel deployment. It intercepts only the
GitHub webhook path (`/github*`), drops every event type the app does not handle,
and forwards only `pull_request` / `pull_request_review` events to the origin.

This removes ~90%+ of Vercel inbound bandwidth (Cloudflare does not bill for
bandwidth; the Worker free plan allows 100k requests/day).

## Layout

- `src/index.js` – the Worker
- `wrangler.toml` – config with `[env.staging]` and production routes

## How it works

- Paths other than `/github*` pass straight through to Vercel (no Worker quota used).
- Filtered events return `200` (so GitHub does not retry) and are never forwarded.
- Genuine PR/review events are forwarded to `ORIGIN_URL`, preserving method, body
  and the `?workspace=` query param.

## Local dev

```sh
npx wrangler dev
```

## Staging (via the `preview` branch)

The staging environment uses the `preview` branch: pushing to it makes Vercel create a
**preview deployment** (its URL is the staging origin), so production is never touched.

1. Push this branch:
   ```sh
   git push -u origin preview
   ```
   Vercel creates a preview deployment. Copy its URL (e.g. `https://<project>-git-preview-...vercel.app`).
2. Confirm the preview app works standalone (webhook can reach its `/github`).
3. Point the staging Worker at that preview URL and deploy:
   ```sh
   npx wrangler secret put ORIGIN_URL --env staging   # -> the Vercel preview URL
   npx wrangler deploy --env staging
   ```
   The staging Worker is bound to the `staging.<domain>` route in `wrangler.toml`.

Test staging:
- `curl -X POST -H "X-GitHub-Event: push" 'https://staging.<domain>/github?workspace=TEST'`
  → expect `200` `ignored`, and **no** Vercel invocation.
- `curl -X POST -H "X-GitHub-Event: pull_request" -H "User-Agent: GitHub-Hookshot" ...`
  → expect it to reach Vercel.

## Production

```sh
npx wrangler deploy
```

`wrangler.toml` already points `ORIGIN_URL` at `https://test.enix.one` (the assigned
domain) and binds the route to `test.enix.one/github*` on zone `enix.one`.

## Rollback

Set the DNS record to **DNS-only (grey cloud)** so traffic goes straight to Vercel
as it does today, or remove the route. Instant and safe.

## Quota note

Free plan: 100k requests/day (resets midnight UTC). On overflow the route fails
**open** by default (traffic passes through to Vercel like today). If peaks exceed
100k/day consistently, move to Workers Paid ($5/mo, 10M req/mo, still no bandwidth
charge).
