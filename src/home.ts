import { proxy } from './proxy'

export function handleHome(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/github-code-review-notifier/',
  })
}
