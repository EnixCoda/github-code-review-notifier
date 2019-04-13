const { proxy } = require('./proxy')

function handleAsset(req, res) {
  proxy.web(req, res, {
    // TODO: decoupling
    target: 'https://enixcoda.github.io/',
  })
}

exports.handleAsset = handleAsset
