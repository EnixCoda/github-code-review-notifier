import { IncomingMessage } from '../extra'
import { getURL, RouteHandler } from './'
import { actions, botSpeak } from './bot'
import * as db from './db'
import { mention, slackLink } from './format'

const GITHUB_EVENT_HEADER_KEY = 'X-GitHub-Event'

const GITHUB_EVENT_TYPES = {
  PING: 'ping',
  PULL_REQUEST: 'pull_request',
  PULL_REQUEST_REVIEW: 'pull_request_review',
}

const GITHUB_EVENT_ACTION_TYPES = {
  REVIEW_REQUESTED: 'review_requested',
  SUBMITTED: 'submitted',
}

const getHeader = (req: IncomingMessage, key: string) =>
  req.headers && (req.headers[key] || req.headers[key.toLowerCase()])

const getWorkspace = (req: IncomingMessage) => {
  const url = getURL(req)
  const workspace = url.searchParams.get('workspace')
  if (!workspace) throw Error(`no workspace provided`)
  return workspace
}

const menuForLinkingOthers = (githubName: string) => ({
  attachments: [
    {
      text: `If ${githubName} is in this workspace, you can link on behalf of his/her with the button below.`,
      fallback: 'Something went wrong.',
      callback_id: 'link_for_others',
      color: '#3AA3E3',
      attachment_type: 'default',
      actions: [
        {
          text: `Link for ${githubName}`,
          type: 'button',
          name: actions.linkOtherUser,
          value: JSON.stringify({ githubName }),
        },
      ],
    },
  ],
})

export const handleGitHubHook: RouteHandler = async (req, data) => {
  // handle application/x-www-form-urlencoded data
  if (data.payload) data = JSON.parse(data.payload)

  const workspace = getWorkspace(req)
  const type = getHeader(req, GITHUB_EVENT_HEADER_KEY)
  if (!type) throw Error(`no github event header provided`)
  switch (type) {
    case GITHUB_EVENT_TYPES.PING:
      return `I'm ready!`
    case GITHUB_EVENT_TYPES.PULL_REQUEST:
      if (data['action'] === GITHUB_EVENT_ACTION_TYPES.REVIEW_REQUESTED) {
        // Sometimes there is no requested reviewer data provided
        if (!data['requested_reviewer']) {
          console.log(`No reviewer requested`)
          return
        }
        const { login: reviewerGitHubName } = data['requested_reviewer']
        let { full_name: repoName } = data['repository'] || {} // In case no repository data were available
        const {
          user: { login: requesterGitHubName },
          html_url: pullRequestURL,
          title: pullRequestTitle,
          number,
        } = data['pull_request']
        if (!repoName) {
          const pullRequestURLRegexp = /^https:\/\/github.com\/(.*?\/.*?)\/pull\/(\d+)$/
          const matched = (<string>pullRequestURL).match(pullRequestURLRegexp)
          if (matched) {
            repoName = matched[1]
          }
        }

        const [requesterUserID, reviewerUserID] = await Promise.all([
          githubNameToSlackID(workspace, requesterGitHubName),
          githubNameToSlackID(workspace, reviewerGitHubName),
        ])

        type Pair = {
          slackUserID: string
          githubName: string
        }
        const pairs = [
          {
            slackUserID: reviewerUserID,
            githubName: reviewerGitHubName,
          },
          {
            slackUserID: requesterUserID,
            githubName: requesterGitHubName,
          },
        ]
        const linkedUsers: Pair[] = []
        const notLinkedGitHubNames: string[] = []
        pairs.forEach(pair => {
          if (pair.slackUserID) {
            linkedUsers.push(pair as Pair) // it's safe
          } else {
            notLinkedGitHubNames.push(pair.githubName)
          }
        })

        if (linkedUsers.length === 0) {
          console.log(`could not find users for`, requesterGitHubName, `nor`, reviewerGitHubName)
          return
        }

        const formattedPRLink = slackLink(
          pullRequestURL,
          `#${number} ${pullRequestTitle.replace(/\+/g, ' ')}`,
        )
        const mainContent = `🧐 ${requesterGitHubName}(${mention(
          requesterUserID,
        )}) requested code review from ${reviewerGitHubName}(${mention(
          reviewerUserID,
        )}):\n${formattedPRLink} in ${repoName}`

        const text = notLinkedGitHubNames.length
          ? `${mainContent}\n\nNote: ${notLinkedGitHubNames.join(
              ', ',
            )} has not been linked to this workspace yet.`
          : mainContent

        return Promise.all(
          linkedUsers.map(({ slackUserID }) => {
            if (notLinkedGitHubNames.length === 0) {
              return botSpeak(workspace, slackUserID, text)
            } else if (notLinkedGitHubNames.length === 1) {
              const [githubName] = notLinkedGitHubNames
              return botSpeak(workspace, slackUserID, text, menuForLinkingOthers(githubName))
            }
            throw new Error('Cannot handle multiple not linked users yet.')
          }),
        )
      } else {
        return 'unresolved action'
      }
    case GITHUB_EVENT_TYPES.PULL_REQUEST_REVIEW:
      switch (data.action) {
        case GITHUB_EVENT_ACTION_TYPES.SUBMITTED:
          const {
            pull_request: {
              user: { login: requesterGitHubName },
            },
            review: {
              state,
              html_url: reviewUrl,
              user: { login: reviewerGitHubName },
            },
          } = data
          if (reviewerGitHubName === requesterGitHubName) {
            // self comment, ignore
            return
          }
          const [requesterUserID, reviewerUserID] = await Promise.all([
            githubNameToSlackID(workspace, requesterGitHubName),
            githubNameToSlackID(workspace, reviewerGitHubName),
          ])
          if (!requesterUserID && !reviewerUserID) {
            console.log(
              `Could not find user for neither ${requesterGitHubName} nor ${reviewerGitHubName}`,
            )
            return
          }
          if (state === 'approved') {
            // approvement message, notify requestor
            if (requesterUserID) {
              return botSpeak(
                workspace,
                requesterUserID,
                `🎉 Your pull request has been approved!\n${reviewUrl}`,
              )
            } else if (reviewerUserID) {
              // we could ask reviewer to introduce this app to PR requester here, but not now
            } else {
              throw new Error('impossible')
            }
          } else {
            // review message
            if (requesterUserID) {
              let text = `👏 ${requesterGitHubName}(${mention(
                requesterUserID,
              )})'s pull request has been reviewed by ${reviewerGitHubName}(${mention(
                reviewerUserID,
              )})\n${reviewUrl}`
              if (!reviewerUserID) {
                const linkNotify = (githubName: string) =>
                  `\n\nNote: ${githubName} has not been linked to this workspace yet.`
                text += linkNotify(reviewerGitHubName)
              }
              return botSpeak(workspace, requesterUserID, text)
            } else if (reviewerUserID) {
              // we could ask reviewer to introduce this app to PR requester here, but not now
            } else {
              throw new Error('impossible')
            }
          }
        default:
          return 'unresolved action'
      }
    default:
      return `no handler for this event type`
  }
}
function githubNameToSlackID(workspace: string, githubName: string): Promise<string | null> {
  return db
    .loadLinks(workspace, { github: githubName })
    .then(links => (links ? links[0].slack : null))
}
