import httpProxy from 'http-proxy'

export const proxy = httpProxy.createProxyServer({
  secure: true,
  autoRewrite: true,
  changeOrigin: true,
})
