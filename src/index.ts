import * as Sentry from '@sentry/node'
import { URL } from 'url'
import { IncomingMessage, RequestListener } from '../extra'
import { decodePayload, IN_PRODUCTION_MODE, logRequestOnError, sentryDSN } from './config'
import { incrementMetric } from './db'

Sentry.init({
  dsn: sentryDSN,
  environment: IN_PRODUCTION_MODE ? 'production' : 'development',
})

export type Route = {
  path: string
  handler?: RequestListener
}

export type RouteHandler<T = ExpectedAny> = (
  req: IncomingMessage,
  data: ExpectedAny,
) => Promise<T> | T

async function safeMetric(name: MetricName) {
  try {
    await incrementMetric(name)
  } catch {
    // Metric writes are best-effort; never let them fail the request.
  }
}

export const getURL = (req: IncomingMessage) => new URL(`https://${req.headers.host}${req.url}`)

const wwwFormParser = (body: string) =>
  body
    .split('&')
    .map(pair => pair.split('='))
    .map(pair => pair.map(decodeURIComponent))
    .reduce(
      (merged, [key, value]) => {
        if (key in merged) {
          if (Array.isArray(merged[key])) (merged[key] as string[]).push(value)
          else merged[key] = [merged[key] as string, value]
        } else merged[key] = value

        return merged
      },
      {} as {
        [key: string]: string | string[]
      },
    )

const getContentParser = (req: IncomingMessage) => {
  switch (req.headers['content-type']) {
    case 'application/x-www-form-urlencoded':
      return wwwFormParser
    case 'application/json':
      return JSON.parse
    default:
      return <T>(_: T) => _
  }
}

const getRequestBody = (req: IncomingMessage) => {
  return new Promise<string>((resolve, reject) => {
    const bodyBuffer: string[] = []
    req.on('data', data => bodyBuffer.push(data.toString()))
    req.on('end', async () => {
      const body = bodyBuffer.join('')
      resolve(body)
    })
    req.on('error', reject)
  })
}

async function parseContent(req: IncomingMessage) {
  const body = await getRequestBody(req)
  const parser = getContentParser(req)
  const data = parser(body)
  return data
}

export const requestHandler: (handler: RouteHandler) => RequestListener = handler => async (
  req,
  res,
) => {
  let data: ExpectedAny
  let result
  try {
    data = await parseContent(req)
    result = await handler(req, data)
    safeMetric('success').catch(() => {}) // fire-and-forget; never block the response
    res.end(result ? JSON.stringify(result) : undefined)
  } catch (err) {
    console.error(err)
    const _err = err as { legacyDeadline?: boolean; message?: string }
    if (_err && _err.legacyDeadline) {
      // Old vercel.app webhook host retired at deadline — signal GitHub to stop.
      res.writeHead(410)
      res.end(_err.message || 'webhook host retired')
      return
    }
    if (decodePayload) {
      if (typeof data === 'object' && data !== null && typeof data.payload === 'string') {
        try {
          data.payload = JSON.parse(decodeURIComponent(data.payload))
        } catch (err) {}
      }
    }
    if (logRequestOnError) {
      // Persist only sanitized metadata to Vercel function logs; never raw webhook bodies.
      console.error(
        JSON.stringify({
          level: 'error',
          path: req.url,
          info: String(err),
        }),
      )
      safeMetric('errors').catch(() => {}) // fire-and-forget; never block the response
      Sentry.withScope(scope => {
        scope.setExtra('path', req.url)
        scope.setExtra('data', data)
        Sentry.captureException(err)
      })
    } else {
      console.log('not logging above error to db')
    }
    res.writeHead(400)
    res.end(String(err))
  }
}
