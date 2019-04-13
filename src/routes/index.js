const paths = {
  GitHub: '/github',
  bot: '/bot',
  interactive: '/interactive-components',
  oauth: '/oauth',
  home: '/',
  githubAssets: '/github-code-review-notifier', // asset path prefix on GitHub pages
}

exports.paths = paths

const bot = require('./bot')
const github = require('./github')
const interactive = require('./interactive')
const oauth = require('./oauth')

const homeRoute = {
  path: paths.home,
}
exports.homeRoute = homeRoute

const assetRoute = {
  path: paths.githubAssets,
}
exports.assetRoute = assetRoute

exports.routes = [
  {
    path: paths.GitHub,
    handler: github,
  },
  {
    path: paths.bot,
    handler: bot,
  },
  {
    path: paths.interactive,
    handler: interactive,
  },
  {
    path: paths.oauth,
    handler: oauth,
  },
  assetRoute,
  homeRoute,
]
