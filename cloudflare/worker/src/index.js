const ALLOWED_EVENTS = ['pull_request', 'pull_request_review']

// Guard CPU time: skip payload parsing for very large bodies.
const MAX_REPO_PARSE = 512 * 1024

const text = (status, body, headers = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  })

function log(msg) {
  console.log(`[filter] ${msg}`)
}

// Resolve the hook action and repo (github.com/<owner>/<name>) from the body.
function extractMeta(contentType, bodyText) {
  if (!bodyText || bodyText.length > MAX_REPO_PARSE) {
    return { repo: 'unknown', action: 'unknown' }
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
      action: (j && j.action) ? String(j.action) : '-',
    }
  } catch (err) {
    return { repo: 'unknown', action: 'unknown' }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname !== '/github') {
      log(`pass-through ${url.pathname}`)
      return fetch(request)
    }

    const event = request.headers.get('x-github-event')
    const ua = request.headers.get('user-agent') || ''
    const contentType = request.headers.get('content-type') || ''
    const bodyText = await request.text()

    const { repo, action } = extractMeta(contentType, bodyText)

    if (!ALLOWED_EVENTS.includes(event)) {
      log(`DROPPED event=${event} repo=${repo} action=${action} ua=${ua}`)
      return text(200, 'ignored')
    }

    if (env.REQUIRE_HOOKSHOT === 'true' && !ua.includes('GitHub-Hookshot')) {
      log(`REJECTED ua=${ua} event=${event} repo=${repo} action=${action}`)
      return text(403, 'unexpected sender')
    }

    log(`ALLOWED event=${event} repo=${repo} action=${action} ua=${ua} -> forward`)

    // Forward the genuine PR/review event to the origin, preserving method,
    // body and the `?workspace=` query param. content-length is re-derived by
    // the runtime for the reconstructed (UTF-8) body.
    const origin = new URL(env.ORIGIN_URL)
    const headers = new Headers(request.headers)
    headers.set('host', origin.host)
    headers.delete('content-length')
    const upstream = new Request(`${origin.origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: bodyText,
      redirect: 'manual',
    })
    return fetch(upstream)
  },
}
