import { URL } from 'url'
import { IncomingMessage, RequestListener } from '../extra'
import { logRequestOnError } from './config'
import { log } from './db'

export type Route = {
  path: string
  handler?: RequestListener
}

export type RouteHandler<T = ExpectedAny> = (
  req: IncomingMessage,
  data: ExpectedAny,
) => Promise<T> | T

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
  let data
  let result
  try {
    data = await parseContent(req)
    result = await handler(req, data)
    res.end(result ? JSON.stringify(result) : undefined)
  } catch (err) {
    console.error(err)
    if (logRequestOnError) {
      log(req.url || '', data || '')
    }
    res.writeHead(400)
    res.end(String(err))
  }
}
