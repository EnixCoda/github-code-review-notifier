const http = require('http')
const { Server } = http
const { routes } = require('./routes/index')

function matchRoute(routes, req) {
  // remove any char after last '/' or '?'
  const match = route => {
    const path = req.url.replace(/(.*?)\/?\?.*/, '$1')
    return route.path.startsWith(path)
  }
  return routes.find(match)
}

const server = Server((req, res) => {
  const route = matchRoute(routes, req)
  if (route) {
    route.handler(req, res)
  } else {
    res.writeHead(400)
    res.end()
  }
})

const port = 8899
server.listen(port, () => {
  console.log('server listening at port', server.address().port)
})
