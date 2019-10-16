import * as Slack from 'slack'
import uuid from 'uuid/v4'
import { paths } from '../api/paths'
import { getURL, RouteHandler } from './'
import { clientID, clientSecret, verificationToken } from './config'
import * as db from './db'

function generateWebhookURL(host: string, workspace: string) {
  return `https://${host}${paths.GitHub}?workspace=${workspace}`
}

const handleChallenge: RouteHandler = (req, data) => {
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
  feedback: `feedback`,
}

const handleAction = (
  workspace: string,
  githubName: string,
  slackUserID: string,
  action: string,
) => {
  switch (action) {
    case actions.link: {
      const succeeded = db.saveLink(workspace, { github: githubName, slack: slackUserID })
      if (succeeded) return `🤝 Linked <@${slackUserID}> to ${githubName}@GitHub!`
      else return `Sorry, could not link.`
    }
    case actions.unlink: {
      const succeeded = db.removeLink(workspace, { github: githubName })
      if (succeeded) return `👋 Unlinked <@${slackUserID}> from ${githubName}@GitHub!`
      else return `Sorry, unlink failed.`
    }
    default:
      throw `unknown command ${action}`
  }
}

export const sendAsBot = (
  botToken: string,
  channel: string,
  text: string,
  extra?: Partial<Chat.PostMessage.Params>,
) =>
  Slack.chat
    .postMessage(Object.assign({ as_user: true, token: botToken, channel, text }, extra))
    .then(({ ok }) => ok)

const menuMessage = {
  attachments: [
    {
      text: 'Hi, I can do these for you, check them out!',
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
        {
          text: 'Feedback',
          type: 'button',
          name: actions.feedback,
          value: actions.feedback,
        },
      ],
    },
  ],
}

export const handleBotMessages: RouteHandler = async (req, data) => {
  switch (data.type) {
    case 'url_verification':
      return handleChallenge(req, data)
  }

  switch (data.event.subtype) {
    case messageTypes.botMessage:
      // ignore bot message
      return
  }

  const workspace = data.team_id
  const { botToken, botID } = await db.loadWorkspace(workspace)

  if (botID === data.event.user) {
    // ignore message from this app
    return
  }

  if (!data.event.user) {
    // might be beautified message, ignore
    return
  }

  await sendAsBot(botToken, data.event.channel, '', {
    attachments: [
      {
        text: 'Hi, I can do these for you, check them out!',
        fallback: 'Something went wrong.',
        callback_id: 'main_menu_callback_id',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: mainMenuActions,
      },
    ],
  })
}

const types = {
  dialogSubmission: `dialog_submission`,
  interactiveMessage: `interactive_message`,
}

export const handleInteractiveComponents: RouteHandler = async function handleInteractiveComponents(
  req,
  data,
) {
  // either user clicked button, or confirmed dialog

  if (data.payload) {
    const payload = JSON.parse(decodeURIComponent(data.payload))
    switch (payload.type) {
      case types.interactiveMessage: {
        const action = payload.actions[0].value
        switch (action) {
          case actions.feedback: {
            const {
              team: { id: workspace },
              channel: { id: channel },
            } = payload
            const { botToken } = await db.loadWorkspace(workspace)
            await sendAsBot(
              botToken,
              channel,
              `📝 If you have any question, feature request or bug report, please <https://github.com/EnixCoda/github-code-review-notifier/issues/new|draft an issue>.`,
            )
            return
          }
          case actions.getWebhook: {
            const {
              team: { id: workspace },
              channel: { id: channel },
            } = payload
            const url = getURL(req)
            const webhook = generateWebhookURL(url.host, workspace)
            const { botToken } = await db.loadWorkspace(workspace)
            await sendAsBot(
              botToken,
              channel,
              `🔧 Please setup your GitHub projects with this webhook:\n${webhook}\n\nNeed help? Read the <https://enixcoda.github.io/github-code-review-notifier/#connect-github-projects|connect GitHub projects> section.`,
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
            const { botToken } = await db.loadWorkspace(workspace)
            const links = await db.loadLinks(workspace, { slack: slackUserID })
            const githubNames = links ? links.map(({ github }) => github) : null
            if (action === actions.unlink) {
              if (!githubNames) {
                const { botToken } = await db.loadWorkspace(workspace)

                await sendAsBot(
                  botToken,
                  channelID,
                  `👻 Hi <@${slackUserID}>, you are not linked to any GitHub users yet. You can get started by clicking "Link to a GitHub account" on the left.`,
                )
              } else {
                await openUnlinkDialog(botToken, payload, githubNames)
              }
            } else {
              await openLinkDialog(botToken, payload, githubNames || undefined)
            }
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
        const responseMessage = await handleAction(workspace, githubName, slackUserID, command)
        const { botToken } = await db.loadWorkspace(workspace)
        await sendAsBot(botToken, channel, responseMessage)

        return
      }
      default:
        console.log(`unknown payload type`, data.payload)
    }
  } else {
    console.log(`no payload detected`)
  }
}

async function openConnectDialog(
  botToken: string,
  payload: SlackPayload,
  state: string,
  title: string,
  elements: SlackElement,
) {
  const { ok } = await Slack.dialog.open({
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
  return ok
}

function openLinkDialog(botToken: string, payload: SlackPayload, githubNames?: string[]) {
  const elements = [
    {
      label: `GitHub Username`,
      name: 'github_name',
      type: 'text',
      hint:
        githubNames && githubNames.length
          ? `You have been linked to ${githubNames.join(', ')}. You can add more.`
          : `Input your GitHub username here, you'll be notified on Slack when requested to review Pull Requests.`,
      placeholder: 'your-github-username',
      max_length: 24,
    },
  ]
  return openConnectDialog(botToken, payload, actions.link, `Link to GitHub`, elements)
}

function openUnlinkDialog(botToken: string, payload: SlackPayload, githubNames: string[]) {
  const elements = [
    {
      label: `GitHub Username`,
      name: 'github_name',
      type: 'select',
      hint: 'Which GitHub user would you like to unlink?',
      options: githubNames.map(githubName => ({
        label: githubName,
        value: githubName,
      })),
    },
  ]
  return openConnectDialog(botToken, payload, actions.unlink, `Undo link`, elements)
}

export const handleOAuth: RouteHandler = async function handleOAuth(req, data) {
  const url = getURL(req)
  const code = url.searchParams.get('code')

  try {
    const {
      access_token: accessToken,
      team_id: workspace,
      bot: { bot_user_id: botID, bot_access_token: botToken },
    } = await Slack.oauth.access({
      client_secret: clientSecret,
      client_id: clientID,
      code,
    })
    await db.createWorkspace(workspace, { accessToken, botID, botToken })
    return `Well done! GitHub Code Review Notifier have been added to your workspace. Check out @CodeReviewNotifier on Slack!`
  } catch (error) {
    console.error(error)
    return `Something went wrong :(`
  }
}
