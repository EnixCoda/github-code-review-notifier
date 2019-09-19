import { proxy } from './proxy'

export function handleAsset(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/',
  })
}
