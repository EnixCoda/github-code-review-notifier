// Only these event/action pairs are handled by the app. Everything else is
// dropped at the edge so it never reaches Vercel.
const ALLOWED_ACTIONS = {
  pull_request: ['review_requested'],
  pull_request_review: ['submitted'],
}
const ALLOWED_EVENTS = Object.keys(ALLOWED_ACTIONS)

// Guard CPU time: skip full payload parsing for very large bodies. The action
// is still extracted from the head so large events can be action-filtered.
const MAX_REPO_PARSE = 512 * 1024
const ACTION_HEAD_BYTES = 4096

const text = (status, body, headers = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  })

function log(msg) {
  console.log(`[filter] ${msg}`)
}

// Normalize path variants so `/github/`, `/GitHub`, `//github` and similar
// spellings cannot bypass the filter. `/github/extra` is not a webhook path.
function isWebhookPath(pathname) {
  const normalized = pathname
    .replace(/^\/+/, '/')
    .replace(/\/+$/, '')
    .toLowerCase()
  return normalized === '/github'
}

// Resolve the hook action and repo (github.com/<owner>/<name>) from the body.
function extractMeta(contentType, bodyText) {
  if (!bodyText) {
    return { repo: 'unknown', action: 'unknown' }
  }

  if (bodyText.length > MAX_REPO_PARSE) {
    // GitHub puts `action` near the start of JSON payloads. Extract it cheaply;
    // if it cannot be found, fail open (action=unknown) rather than dropping a
    // legitimate notification.
    const match = /"action"\s*:\s*"([^"]+)"/.exec(
      bodyText.slice(0, ACTION_HEAD_BYTES),
    )
    return { repo: 'unknown', action: match ? match[1] : 'unknown' }
  }

  try {
    let payload = bodyText
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const parsed = new URLSearchParams(bodyText)
      payload = parsed.get('payload') || ''
      if (!payload) return { repo: 'unknown', action: 'unknown' }
    }
    const j = JSON.parse(payload)
    return {
      repo: (j && j.repository && j.repository.full_name) || 'unknown',
      action: j && j.action ? String(j.action) : '-',
    }
  } catch (err) {
    return { repo: 'unknown', action: 'unknown' }
  }
}

// Fire-and-forget: upsert a day-bucketed per-repo/action counter. Never blocks
// the response, and a D1 failure is logged but cannot break filtering.
function recordHit(ctx, env, repo, action) {
  const db = env.github_webhook_filter
  if (!db) return
  const day = new Date().toISOString().slice(0, 10)
  const p = db
    .prepare(
      `INSERT INTO hits(day, repo, action, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(day, repo, action) DO UPDATE SET count = count + 1`,
    )
    .bind(day, String(repo), String(action))
    .run()
  ctx.waitUntil(p.catch(err => log(`d1-error ${err}`)))
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (!isWebhookPath(url.pathname)) {
      log(`pass-through ${url.pathname}`)
      return fetch(request)
    }

    const event = request.headers.get('x-github-event')
    const ua = request.headers.get('user-agent') || ''
    const contentType = request.headers.get('content-type') || ''
    const bodyText = await request.text()

    const { repo, action } = extractMeta(contentType, bodyText)
    recordHit(ctx, env, repo, action)

    if (!ALLOWED_EVENTS.includes(event)) {
      log(`DROPPED event=${event} repo=${repo} action=${action} ua=${ua}`)
      return text(200, 'ignored')
    }

    if (env.REQUIRE_HOOKSHOT === 'true' && !ua.includes('GitHub-Hookshot')) {
      log(`REJECTED ua=${ua} event=${event} repo=${repo} action=${action}`)
      return text(403, 'unexpected sender')
    }

    // The app only handles these specific actions. `unknown` means the body
    // was too large/unparseable, so fail open instead of risking a lost event.
    const allowedActions = ALLOWED_ACTIONS[event]
    if (
      allowedActions &&
      action !== 'unknown' &&
      !allowedActions.includes(action)
    ) {
      log(`DROPPED-ACTION event=${event} repo=${repo} action=${action} ua=${ua}`)
      return text(200, 'ignored')
    }

    log(`ALLOWED event=${event} repo=${repo} action=${action} ua=${ua} -> forward`)

    // Forward the genuine PR/review event to the origin, preserving method,
    // body and the `?workspace=` query param. Use the canonical `/github`
    // path so variants such as `/GitHub/` reach the same origin route.
    const origin = new URL(env.ORIGIN_URL)
    const headers = new Headers(request.headers)
    headers.set('host', origin.host)
    headers.delete('content-length')
    const upstream = new Request(`${origin.origin}/github${url.search}`, {
      method: request.method,
      headers,
      body: bodyText,
      redirect: 'manual',
    })
    return fetch(upstream)
  },
}
