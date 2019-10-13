import { RequestListener } from '../extra'
import { proxy } from '../src/proxy'

export const handleHome: RequestListener = function handleHome(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/github-code-review-notifier/',
  })
}

export default handleHome
