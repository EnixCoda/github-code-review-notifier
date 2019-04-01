const getURL = req => new URL(`https://${req.headers.host}${req.url}`)
exports.getURL = getURL

const wwwFormParser = body =>
  body
    .split('&')
    .map(pair => pair.split('='))
    .map(pair => pair.map(decodeURIComponent))
    .reduce((merged, [key, value]) => {
      merged[key] = value
      return merged
    }, {})

const getContentParser = req => {
  switch (req.headers['content-type']) {
    case 'application/x-www-form-urlencoded':
      return wwwFormParser
    case 'application/json':
      return JSON.parse
    default:
      return _ => _
  }
}

const getRequestBody = req => {
  return new Promise((resolve, reject) => {
    const bodyBuffer = []
    req.on('data', data => bodyBuffer.push(data.toString()))
    req.on('end', async () => {
      const body = bodyBuffer.join('')
      resolve(body)
    })
    req.on('error', reject)
  })
}

async function parseContent(req) {
  const body = await getRequestBody(req)
  const parser = getContentParser(req)
  const data = parser(body)
  return data
}

const requestHandler = handler => async (req, res) => {
  try {
    const data = await parseContent(req)
    const result = await handler(req, data)
    res.writeHead(200)
    res.end(result ? JSON.stringify(result) : undefined)
  } catch (err) {
    console.error(err)
    res.writeHead(400)
    res.end(String(err))
  }
}

exports.requestHandler = requestHandler
