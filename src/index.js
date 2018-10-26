const http = require('http')
const { Server } = http

const { routes } = require('./routes')

const getContentParser = req => {
  switch (req.headers['content-type']) {
    case 'application/x-www-form-urlencoded':
      return rawData => rawData
        .split('&')
        .map(pair => pair.split('='))
        .map(pair => pair.map(decodeURIComponent))
        .reduce((merged, [key, value]) => {
          merged[key] = value
          return merged
        }, {})
    case 'application/json':
      return JSON.parse
    default:
      return _ => _
  }
}

const getRequestBody = (req) => {
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

const handleData = (req, data) => {
  const route = routes.find(({ match }) => match(req, data))
  console.log(JSON.stringify(data))
  if (!route) {
    throw Error(`unknown request type`)
  }
  return route.handler(req, data)
}

const requestHandler = async (req, res) => {
  try {
    const body = await getRequestBody(req)
    const parser = getContentParser(req)
    const data = parser(body)
    const result = await handleData(req, data)
    res.writeHead(200, {
      'Content-type': `application/json`,
    })
    res.end(result ? JSON.stringify(result) : undefined)
  } catch(err) {
    console.error(err)
    res.writeHead(400)
    res.end(String(err))
  }
}

const server = Server(requestHandler)

const port = 8899
server.listen(port, () => {
  console.log('server listening at port', server.address().port)
})
