import { RequestListener } from 'http'
import { proxy } from './proxy'

export const handleHome: RequestListener = function handleHome(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/github-code-review-notifier/',
  })
}
