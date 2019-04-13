const { proxy } = require('./proxy')

function handleHome(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/github-code-review-notifier/',
  })
}

exports.handleHome = handleHome
