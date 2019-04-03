const bot = require('./bot')
const github = require('./github')
const interactive = require('./interactive')
const oauth = require('./oauth')

const paths = {
  GitHub: '/github',
  bot: '/bot',
  interactive: '/interactive-components',
  oauth: '/oauth',
}

exports.paths = paths

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
]
