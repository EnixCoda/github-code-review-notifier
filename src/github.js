const db = require('./db')
const { sendAsBot } = require('./bot')
const routes = require('./routes')

const GITHUB_EVENT_HEADER_KEY = 'X-GitHub-Event'

const GITHUB_EVENT_TYPES = {
  PING: 'ping',
  PULL_REQUEST: 'pull_request',
}

const GITHUB_EVENT_ACTION_TYPES = {
  REVIEW_REQUESTED: 'review_requested',
}

const getHeader = (req, key) => req.headers && (req.headers[key] || req.headers[key.toLowerCase()])

const getWorkspace = (req, data) => {
  const url = routes.getURL(req)
  const workspace = url.searchParams.get('workspace')
  if (!workspace) throw Error(`no workspace provided`)
  return workspace
}

exports.handleGitHubHook = (req, data) => {
  // handle application/x-www-form-urlencoded data
  if (data.payload) data = JSON.parse(data.payload)

  const workspace = getWorkspace(req, data)
  const type = getHeader(req, GITHUB_EVENT_HEADER_KEY)
  switch (type) {
    case GITHUB_EVENT_TYPES.PING:
      return `I'm ready!`
    case GITHUB_EVENT_TYPES.PULL_REQUEST:
      if (data['action'] === GITHUB_EVENT_ACTION_TYPES.REVIEW_REQUESTED) {
        const pullRequest = data['pull_request']
        const requestedReviewer = data['requested_reviewer']
        const {
          user: { login: requesterGitHubName },
          html_url: pullRequestURL,
        } = pullRequest
        const { login: reviewerGitHubName } = requestedReviewer
        return Promise.all([
          db.loadWorkspace(workspace),
          ...[requesterGitHubName, reviewerGitHubName].map(githubName =>
            db.loadLinks(workspace, { githubName }).then(links => links ? links[0].slack : null)
          )
        ]).then(([{ botToken }, requesterUserID, reviewerUserID]) => {
          if (reviewerUserID) {
            const text = `${requesterGitHubName}(<@${requesterUserID}>) requested code review from ${reviewerGitHubName}(<@${reviewerUserID}>):\n${pullRequestURL}`
            return sendAsBot(botToken, reviewerUserID, text)
          } else if (requesterUserID) {
            const text = `Hi, I received your code review request but ${reviewerGitHubName} has not been linked to this workspace yet.`
            return sendAsBot(botToken, requesterUserID, text)
          } else {
            console.log(`could not find users for`, requesterGitHubName, `and`, reviewerGitHubName)
          }
        })
      }
    default:
      if (!type) throw Error(`no github event header provided`)
      return `no handler for this event type`
  }
}
