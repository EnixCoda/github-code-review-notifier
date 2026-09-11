const ALLOWED_EVENTS = ['pull_request', 'pull_request_review']

const text = (status, body, headers = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  })

function log(msg) {
  console.log(`[filter] ${msg}`)
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

    // Cheap header filter: drop any event type the app does not handle.
    // Return 200 so GitHub does not retry the delivery.
    if (!ALLOWED_EVENTS.includes(event)) {
      log(`DROPPED event=${event} ua=${ua}`)
      return text(200, 'ignored')
    }

    // Hardening: only accept requests that look like they came from GitHub.
    if (env.REQUIRE_HOOKSHOT === 'true' && !ua.includes('GitHub-Hookshot')) {
      log(`REJECTED ua=${ua} event=${event}`)
      return text(403, 'unexpected sender')
    }

    log(`ALLOWED event=${event} ua=${ua} -> forward`)

    // Forward the genuine PR/review event to the origin, preserving
    // method, body and the `?workspace=` query param.
    const origin = new URL(env.ORIGIN_URL)
    const headers = new Headers(request.headers)
    headers.set('host', origin.host)
    const upstream = new Request(`${origin.origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    })
    return fetch(upstream)
  },
}
