const http = require('http')
const { Server } = http
const { routes, homeRoute, assetRoute } = require('./routes/index')
const { handleHome } = require('./home')
const { handleAsset } = require('./asset')

function matchRoute(routes, req) {
  const match = route => {
    // /path, /path/, /path/?q, /path?q  -->  /path
    const path = req.url.replace(/^(.*?)\?.*/, '$1').replace(/([^\/])$/, '$1/')
    // route.path is at least a sub-route of request path
    return path.startsWith(route.path.replace(/([^\/])$/, '$1/'))
  }
  return routes.find(match)
}

const server = Server((req, res) => {
  const route = matchRoute(routes, req)
  if (route) {
    if (route === homeRoute) {
      return handleHome(req, res)
    } else if (route === assetRoute) {
      return handleAsset(req, res)
    } else {
      route.handler(req, res)
    }
  } else {
    res.writeHead(400)
    res.end()
  }
})

const port = 8899
server.listen(port, () => {
  console.log('server listening at port', server.address().port)
})
