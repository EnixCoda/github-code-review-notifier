const Slack = require('slack')
const uuid = require('uuid/v4')
const db = require('./db')
const { verificationToken, clientSecret, clientID } = require('./config')
const routes = require('./routes')

function generateWebhookURL(host, workspace) {
  return `https://${host}${routes.paths.GitHub}?workspace=${workspace}`
}

exports.notifyRequest = function notifyRequest(workspace, githubName, pullRequestURL) {
  return db.loadLinks(workspace, { githubName }).then(slackNames => {
    slackNames.forEach(slackName =>
      Slack.send(workspace, slackName, `please review`, pullRequestURL)
    )
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

const actions = {
  getWebhook: `get-webhook`,
  link: `link`,
  unlink: `unlink`,
}

const commandRegexp = /(link|unlink) ([\w-]+)/

const handleCommand = (workspace, githubName, slackUserID, command) => {
  switch (command) {
    case actions.link:
      return db.saveLink(workspace, { githubName, slackUserID }).then(succeeded => {
        if (succeeded) return `Linked <@${slackUserID}> to ${githubName}@GitHub, congrats!`
        else return `Sorry, could not link.`
      })
    case actions.unlink:
      return db.removeLink(workspace, { githubName, slackUserID }).then(succeeded => {
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

const sendAsBot = (botToken, channel, text, extra) =>
  Slack.chat
    .postMessage(Object.assign({ token: botToken, channel, text }, extra))
    .then(({ ok }) => ok)

exports.sendAsBot = sendAsBot

const menuMessage = {
  attachments: [
    {
      text: 'Hi there! I can do these for you, check them out!',
      fallback: 'Something went wrong.',
      callback_id: 'link_or_unlink',
      color: '#3AA3E3',
      attachment_type: 'default',
      actions: [
        {
          text: 'Link to a GitHub account',
          type: 'button',
          name: actions.link,
          value: actions.link,
        },
        {
          text: 'Undo link',
          type: 'button',
          name: actions.unlink,
          value: actions.unlink,
        },
        {
          text: 'Get GitHub webhook URL',
          type: 'button',
          name: actions.getWebhook,
          value: actions.getWebhook,
        },
      ],
    },
  ],
}

exports.handleBotMessages = (req, data) => {
  if (data.type === 'url_verification') {
    return handleChallenge(data)
  }
  switch (data.event.subtype) {
    case messageTypes.botMessage: {
      console.log(`That is a bot message, ignoring.`)
      return
    }
    default: {
      const workspace = data.team_id
      return handleMessage(data).then(result =>
        db.loadWorkspace(workspace).then(({ botToken }) => {
          if (result === false) {
            // in unknown format
            return sendAsBot(botToken, data.event.channel, '', menuMessage)
          } else {
            return sendAsBot(botToken, data.event.channel, result)
          }
        })
      )
    }
  }
}

const types = {
  dialogSubmission: `dialog_submission`,
  interactiveMessage: `interactive_message`,
}

exports.handleInteractiveComponents = async (req, data) => {
  // either user clicked button, or confirmed dialog

  if (data.payload) {
    const payload = JSON.parse(decodeURIComponent(data.payload))
    switch (payload.type) {
      case types.interactiveMessage: {
        const action = payload.actions[0].value
        switch (action) {
          case actions.getWebhook: {
            const {
              team: { id: workspace },
              channel: { id: channel },
            } = payload
            const url = routes.getURL(req)
            const webhook = generateWebhookURL(url.host, workspace)
            db.loadWorkspace(workspace).then(({ botToken }) =>
              sendAsBot(
                botToken,
                channel,
                `Please set up your project's webhook with this URL:\n${webhook}`
              )
            )
            return
          }
          case actions.link:
          case actions.unlink: {
            const {
              team: { id: workspace },
              user: { id: slackUserID },
              channel: { id: channelID },
            } = payload
            db.loadWorkspace(workspace).then(({ botToken }) => {
              db.loadLinks(workspace, { slackUserID }).then(links => {
                const githubNames = links ? links.map(({ github }) => github) : null
                if (action === actions.unlink) {
                  if (!githubNames)
                    db.loadWorkspace(workspace).then(({ botToken }) =>
                      sendAsBot(
                        botToken,
                        channelID,
                        `Hi <@${slackUserID}>, you are not linked to any GitHub user yet.`
                      )
                    )
                  else openUnlinkDialog(botToken, payload, githubNames).catch(console.error)
                } else {
                  openLinkDialog(botToken, payload, githubNames).catch(console.error)
                }
              })
            })
          }
          default:
            break
        }
        return
      }
      case types.dialogSubmission: {
        const {
          state: command,
          team: { id: workspace },
          channel: { id: channel },
          user: { id: slackUserID },
          submission: { github_name: githubName },
        } = payload
        handleCommand(workspace, githubName, slackUserID, command).then(text =>
          db.loadWorkspace(workspace).then(({ botToken }) => sendAsBot(botToken, channel, text))
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

function openConnectDialog(botToken, payload, state, title, elements) {
  return Slack.dialog.open({
    token: botToken,
    trigger_id: payload.trigger_id,
    dialog: {
      callback_id: uuid(),
      title,
      submit_label: 'Submit',
      state,
      elements,
    },
  })
}

function openLinkDialog(botToken, payload, githubNames) {
  const elements = [
    {
      label: `GitHub Username`,
      name: 'github_name',
      type: 'text',
      placeholder: 'your-github-username',
      hint:
        githubNames && githubNames.length
          ? `You have been linked to ${githubNames.join(', ')}. You can add more.`
          : `Input your GitHub username here, you'll be notified on Slack when requested to review Pull Requests.`,
      max_length: 24,
    },
  ]
  return openConnectDialog(botToken, payload, actions.link, `Link to GitHub`, elements)
}
exports.openLinkDialog = openLinkDialog

function openUnlinkDialog(botToken, payload, githubNames) {
  const elements = [
    {
      label: `GitHub Username`,
      hint: 'Which GitHub user would you like to unlink?',
      name: 'github_name',
      type: 'select',
      options: githubNames.map(githubName => ({
        label: githubName,
        value: githubName,
      })),
    },
  ]
  return openConnectDialog(botToken, payload, actions.unlink, `Undo link`, elements)
}
exports.openUnlinkDialog = openUnlinkDialog

function handleOAuth(req, data) {
  const url = routes.getURL(req)
  const code = url.searchParams.get('code')
  return Slack.oauth
    .access({
      client_secret: clientSecret,
      client_id: clientID,
      code,
    })
    .then(
      ({
        access_token: accessToken,
        team_id: workspace,
        bot: { bot_user_id: botID, bot_access_token: botToken },
      }) =>
        db
          .createWorkspace(workspace, { accessToken, botID, botToken })
          .then(
            () =>
              `Well done! GitHub Code Review Notifier have been added to your workspace. Check out @CodeReviewNotifier on Slack!`
          )
    )
    .catch(error => {
      console.error(error)
      return `Something went wrong :(`
    })
}
exports.handleOAuth = handleOAuth
