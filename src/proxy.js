const httpProxy = require('http-proxy')

const proxy = httpProxy.createProxyServer({
  secure: true,
  autoRewrite: true,
  changeOrigin: true,
})

exports.proxy = proxy
