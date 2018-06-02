const https = require('https')
const http = require('http')
const { Server } = http

const db = require('./db')
const config = require('./config')

const SLACK_COMMANDS = {
  LINK: '/link',
}
const handleSlackCommand = (command, data) =>
  new Promise((resolve, reject) => {
    switch (command) {
      case SLACK_COMMANDS.LINK: {
        const slackUserID = (data.get('user_id') || '').trim()
        const githubName = (data.get('text') || '').trim()
        if (!slackUserID || !githubName) {
          return reject()
        } else {
          return db.saveLink(githubName, slackUserID)
            .then(
              () => sendToSlack(`linked <@${slackUserID}> with ${githubName}@GitHub!`),
              () => sendToSlack(`failed linking <@${slackUserID}> with ${githubName}@GitHub.`)
            )
            .then(resolve)
        }
      }

      default:
        return resolve(data)
    }
  })

const GITHUB_EVENT_TYPES = {
  PULL_REQUEST: 'pull_request',
}
const handleGitHubHook = (type, data) =>
  new Promise((resolve, reject) => {
    switch (type) {
      case GITHUB_EVENT_TYPES.PULL_REQUEST:
        if (data.get('action') === 'review_requested') {
          const pullRequest = data.get('pull_request')
          const requestedReviewer = data.get('requested_reviewer')
          const {
            user: { login: requesterGitHubName },
            html_url: pullRequestURL,
          } = pullRequest
          const { login: reviewerGitHubName } = requestedReviewer
          return Promise.all(
            [requesterGitHubName, reviewerGitHubName].map(db.readLink)
          )
            .then(
              ([requesterUserID, reviewerUserID]) =>
                `${requesterGitHubName}(<@${requesterUserID}>) requested code review from ${reviewerGitHubName}(<@${reviewerUserID}>):\n${pullRequestURL}`
            )
            .then(sendToSlack)
            .then(resolve)
        }
      default:
        return resolve(data)
    }
  })

const formatForSlackAPI = content => JSON.stringify({ text: content })

const sendToSlack = content =>
  new Promise((resolve, reject) => {
    const reqContent = formatForSlackAPI(content)
    const options = {
      ...config.slack.hook.URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqContent),
      },
    }
    const req = https.request(options, res => {
      res.on('data', () => {})
      res.on('end', () => resolve())
    })

    req.on('error', reject)
    req.write(reqContent)
    req.end()
  })

const getContentParser = req => {
  switch (req.headers['content-type']) {
    case 'application/x-www-form-urlencoded':
      return rawData =>
        new Map(
          rawData
            .split('&')
            .map(pair => pair.split('='))
            .map(pair => pair.map(decodeURIComponent))
        )
    case 'application/json':
      return rawData => new Map(Object.entries(JSON.parse(rawData)))
    default:
      return () => new Map()
  }
}

const GITHUB_EVENT_HEADER_KEY = 'X-GitHub-Event'

const getHeader = (header, key) => header[key] || header[key.toLowerCase()]

const handleData = (req, data) => {
  try {
    const gitHubEventType = getHeader(req.headers, GITHUB_EVENT_HEADER_KEY)
    if (gitHubEventType) {
      // event from GitHub
      return handleGitHubHook(gitHubEventType, data)
    }

    const slackCommandType = data.get('command')
    if (slackCommandType) {
      // command from Slack
      return handleSlackCommand(slackCommandType, data)
    }
  } catch (err) {
    return 'oops, something went wrong.'
  }
}

const requestHandler = (req, res) => {
  const bodyBuffer = []
  req.on('data', data => bodyBuffer.push(data.toString()))
  req.on('end', () => {
    const body = bodyBuffer.join('')
    const parser = getContentParser(req)
    const data = parser(body)
    Promise.resolve(handleData(req, data))
      .then(r => JSON.stringify(r))
      .then(r => res.end(r))
  })
}

const server = Server(requestHandler)

const port = 8899
server.listen(port, () => {
  console.log('server listening at port', server.address().port)
})
