import { RequestListener } from '../extra'
import { proxy } from '../src/proxy'

export const handleAsset: RequestListener = function handleAsset(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/',
  })
}

export default handleAsset
