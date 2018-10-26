const { handleBotMessages, handleInteractiveComponents, handleOAuth } = require('./bot')
const { handleGitHubHook } = require('./github')

const paths = {
  GitHub: '/github',
  bot: '/bot',
  interactive: '/interactive-components',
  oauth: '/oauth',
}

exports.paths = paths

const getURL = req => new URL(`https://${req.headers.host}${req.url}`)
exports.getURL = getURL

const matchPath = (req, path) => {
  const url = getURL(req)
  return url.pathname === `${path}` || url.pathname.indexOf(`${path}/`) === 0
}

exports.routes = [
  {
    match: (req, data) => matchPath(req, paths.bot),
    handler: handleBotMessages,
  },
  {
    match: (req, data) => matchPath(req, paths.interactive),
    handler: handleInteractiveComponents,
  },
  {
    match: (req, data) => matchPath(req, paths.GitHub),
    handler: handleGitHubHook,
  },
  {
    match: (req, data) => matchPath(req, paths.oauth),
    handler: handleOAuth,
  },
]
