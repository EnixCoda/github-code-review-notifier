# GitHub webhook filter (Cloudflare Worker)

Edge filter that sits in front of the Vercel deployment. It intercepts only the
GitHub webhook path (`/github*`), drops every event type the app does not handle,
and forwards only `pull_request` / `pull_request_review` events to the origin
(preserving method, body and the `?workspace=` query param).

This removes the bulk of Vercel inbound bandwidth (Cloudflare does not bill for
bandwidth; the Worker free plan allows 100k requests/day).

## Layout

- `src/index.js` – the Worker
- `wrangler.toml` – config with `[env.staging]` (preview) and default (production) routes
- `Makefile` – deploy helpers

## How it works

- Paths other than `/github*` pass straight through to Vercel (no Worker quota used).
- Filtered events return `200` (so GitHub does not retry) and are never forwarded.
- Genuine PR/review events are forwarded to `ORIGIN_URL`.

## Domains

- **Production** (default `wrangler deploy`): `github-code-review-notifier.enix.one/github*`,
  `ORIGIN_URL=https://github-code-review-notifier.enix.one`
- **Preview/staging** (`wrangler deploy --env staging`): `test.enix.one/github*`,
  `ORIGIN_URL=https://test.enix.one`

`ORIGIN_URL` and `REQUIRE_HOOKSHOT` are plain vars in `wrangler.toml` (no secrets needed).

## Deploy

```sh
# production (default)
npx wrangler deploy

# preview
npx wrangler deploy --env staging
```

Both Workers are already deployed and verified (filter drops non-PR/review events;
same-zone forwarding does not loop).

## Rollback

Change the DNS record back to **DNS-only (grey cloud)** so traffic goes straight to
Vercel, or remove/disable the Worker route. Instant and safe.

## Merge-to-master note

This branch must only be merged to `master` **together with** adding the app env
vars to the Vercel project. `master` still carries the deprecated `now.json`; this
branch migrates it to `vercel.json`, and a deploy built from `vercel.json` needs
`FIREBASE`, `CLIENT_SECRET`, `SIGNING_SECRET`, `CLIENT_ID`, `VERIFICATION_TOKEN`,
`SENTRY_PUBLIC_KEY`, `SENTRY_PROJECT_ID` set in Vercel settings, otherwise the
functions fail at startup. Promoting earlier would break prod.

## Quota note

Free plan: 100k requests/day (resets midnight UTC). On overflow the route fails
**open** by default (traffic passes through to Vercel). If peaks exceed 100k/day
consistently, move to Workers Paid ($5/mo, 10M req/mo, still no bandwidth charge).
