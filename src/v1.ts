import http, { IncomingMessage } from 'http'
import { Route } from '.'
import { handleAsset } from './asset'
import { handleHome } from './home'
import { assetRoute, homeRoute, routes } from './routes/index'
const { Server } = http

function matchRoute(routes: Route[], req: IncomingMessage) {
  const match = (route: Route) => {
    // /path, /path/, /path/?q, /path?q  -->  /path
    if (!req.url) throw new Error('no URL provided')
    const path = req.url.replace(/^(.*?)\?.*/, '$1').replace(/([^\/])$/, '$1/')
    // route.path is at least a sub-route of request path
    return path.startsWith(route.path.replace(/([^\/])$/, '$1/'))
  }
  return routes.find(match)
}

const server = new Server((req, res) => {
  const route = matchRoute(routes, req)
  if (route) {
    if (route === homeRoute) {
      return handleHome(req, res)
    } else if (route === assetRoute) {
      return handleAsset(req, res)
    } else if (route.handler) {
      route.handler(req, res)
    } else {
      res.end()
    }
  } else {
    res.writeHead(400)
    res.end()
  }
})

const port = 8899
server.listen(port, () => {
  const address = server.address()
  if (!address) throw new Error('no address')
  console.log('server listening at port', address)
})
