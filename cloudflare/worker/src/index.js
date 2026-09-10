const ALLOWED_EVENTS = ['pull_request', 'pull_request_review']

const text = (status, body, headers = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  })

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Only intercept the GitHub webhook path; every other path passes through untouched.
    if (url.pathname !== '/github') return fetch(request)

    // Cheap header filter: drop any event type the app does not handle.
    // Return 200 so GitHub does not retry the delivery.
    const event = request.headers.get('x-github-event')
    if (!ALLOWED_EVENTS.includes(event)) return text(200, 'ignored')

    // Hardening: only accept requests that look like they came from GitHub.
    const ua = request.headers.get('user-agent') || ''
    if (env.REQUIRE_HOOKSHOT === 'true' && !ua.includes('GitHub-Hookshot')) {
      return text(403, 'unexpected sender')
    }

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
