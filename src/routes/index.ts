export const paths = {
  GitHub: '/github',
  bot: '/bot',
  interactive: '/interactive-components',
  oauth: '/oauth',
  home: '/',
  githubAssets: '/github-code-review-notifier', // asset path prefix on GitHub pages
}

import bot from './bot'
import github from './github'
import interactive from './interactive'
import oauth from './oauth'

export const homeRoute = {
  path: paths.home,
}

export const assetRoute = {
  path: paths.githubAssets,
}

export const routes = [
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
