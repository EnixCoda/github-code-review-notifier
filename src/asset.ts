import { RequestListener } from 'http'
import { proxy } from './proxy'

export const handleAsset: RequestListener = function handleAsset(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/',
  })
}
