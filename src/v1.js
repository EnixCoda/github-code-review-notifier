const http = require('http')
const { Server } = http
const { routes } = require('./routes/index')

function matchRoute(routes, req) {
  return routes.find(route => route.path.startsWith(req.url.split('?')[0]))
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
