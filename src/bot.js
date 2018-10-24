const db = require('./db')
const Slack = require('slack')
const { verificationToken, botToken } = require('./config')
const routes = require('./routes')

function generateWebhookURL(host, workspace) {
  return `https://${host}${routes.paths.GitHub}?workspace=${workspace}`
}

exports.registerWorkspace = function registerWorkspace(workspace) {
  return db
    .createWorkspace(workspace)
    .then(() => generateWebhookURL(workspace))
    .then(
      webhook => {
        sendAsBot(``, `Please paste this URL to your GitHub project.\n${webhook}`)
      },
      error => {
        console.error(error)
        sendAsBot(``, `Could not register workspace`)
      }
    )
}

exports.notifyRequest = function notifyRequest(workspace, githubName, pullRequestURL) {
  return db.loadLink(workspace, { githubName }).then(slackName => {
    Slack.send(workspace, slackName, `please review`, pullRequestURL)
  })
}

const handleChallenge = data => {
  if (data.token !== verificationToken) throw Error('wrong verification token')
  return { challenge: data.challenge }
}

const messageTypes = {
  botMessage: 'bot_message',
  appMention: 'app_mention',
}

const commandRegexp = /(link|unlink) ([\w-]+)/

const handleCommand = (workspace, githubName, slackUserID, command) => {
  switch (command) {
    case 'link':
      return db.saveLink(workspace, githubName, slackUserID).then(succeeded => {
        if (succeeded) return `Linked <@${slackUserID}> to ${githubName}@GitHub!`
        else return `Sorry, could not link.`
      })
    case 'unlink':
      return db.removeLink(workspace, githubName, slackUserID).then(succeeded => {
        if (succeeded) return `Unlinked <@${slackUserID}> from ${githubName}@GitHub!`
        else return `Sorry, unlink failed.`
      })
    default:
      throw `unknown command ${command}`
  }
}

const handleMessage = async data => {
  const text = data.event.text
  // not simple text message
  if (typeof text === undefined) return false

  const matched = text.match(commandRegexp)
  if (!matched) return false

  const [, command, githubName] = matched
  const workspace = data.team_id
  const slackUserID = data.event.user
  return handleCommand(workspace, githubName, slackUserID, command)
}

const sendAsBot = (channel, text, extra) =>
  Slack.chat
    .postMessage(Object.assign({ token: botToken, channel, text }, extra))
    .then(({ ok }) => ok)

exports.sendAsBot = sendAsBot

exports.handleBotMessages = (req, data) => {
  console.log(JSON.stringify(data))
  if (data.type === 'url_verification') {
    return handleChallenge(data)
  }
  switch (data.event.subtype) {
    case messageTypes.botMessage:
      console.log(`That is a bot message, ignoring.`)
      return
    default:
      return handleMessage(data).then(result => {
        if (result === false) {
          // in unknown format
          return sendAsBot(data.event.channel, '', {
            attachments: [
              {
                text: 'Either link or unlink your Slack account with GitHub account.',
                fallback: 'Something went wrong.',
                callback_id: 'link_or_unlink',
                color: '#3AA3E3',
                attachment_type: 'default',
                actions: [
                  {
                    name: 'link',
                    text: 'Link',
                    type: 'button',
                    value: 'link',
                  },
                  {
                    name: 'unlink',
                    text: 'Undo link',
                    type: 'button',
                    value: 'unlink',
                  },
                  {
                    name: 'get-webhook',
                    text: 'Get webhook URL for GitHub',
                    type: 'button',
                    value: 'get-webhook',
                  },
                ],
              },
            ],
          })
        } else {
          return sendAsBot(data.event.channel, result)
        }
      })
  }
}

const types = {
  dialogSubmission: `dialog_submission`,
  interactiveMessage: `interactive_message`,
}

exports.handleInteractiveComponents = async (req, data) => {
  // either user clicked button, or confirmed dialog
  console.log(JSON.stringify(data))

  if (data.payload) {
    const payload = JSON.parse(decodeURIComponent(data.payload))
    switch (payload.type) {
      case types.interactiveMessage: {
        const action = payload.actions[0].value
        switch (action) {
          case 'get-webhook': {
            const {
              team: { id: workspace },
              channel: { id: channel },
            } = payload
            const url = routes.getURL(req)
            const webhook = generateWebhookURL(url.host, workspace);
            sendAsBot(channel, `Please set up your project's webhook with this URL:\n${webhook}`)
            return
          }
          case 'link':
          case 'unlink': {
            const {
              team: { id: workspace },
              user: { id: slackUserID },
            } = payload
            const githubName = await db.loadLink(workspace, { slackUserID })
            Slack.dialog.open({
              token: botToken,
              trigger_id: payload.trigger_id,
              dialog: {
                callback_id: 'ryde-46e2b0',
                title: 'Request a Ride',
                submit_label: 'Request',
                notify_on_cancel: true,
                state: 'Limo',
                elements: [
                  {
                    label: 'Action Type',
                    name: 'action_type',
                    type: 'select',
                    value: action,
                    options: [
                      {
                        label: 'Link',
                        value: 'link',
                      },
                      {
                        label: 'Unlink',
                        value: 'unlink',
                      },
                    ],
                  },
                  {
                    label: 'GitHub username',
                    name: 'github_name',
                    type: 'text',
                    placeholder: 'your-github-username',
                    value: githubName,
                  },
                ],
              },
            })
          }
          default:
            break
        }
        return
      }
      case types.dialogSubmission: {
        const {
          team: { id: workspace },
          channel: { id: channel },
          user: { id: slackUserID },
          submission: { action_type: command, github_name: githubName },
        } = payload
        handleCommand(workspace, githubName, slackUserID, command).then(text =>
          sendAsBot(channel, text)
        )
        // to complete an dialog, return 200 with empty body
        return
      }
      default:
        console.log(`unknown payload type`, data.payload)
    }
  } else {
    console.log(`no payload detected`)
  }
}
