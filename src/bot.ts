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

export const actions = {
  getWebhook: `get-webhook`,
  link: `link`,
  linkOtherUser: `link-other-user`,
  unlink: `unlink`,
  feedback: `feedback`,
}

export async function botSpeak(
  workspace: string,
  channel: string,
  text: string,
  extra?: Partial<Chat.PostMessage.Params>,
) {
  const { botToken } = await db.loadWorkspace(workspace)
  return Slack.chat
    .postMessage(Object.assign({ as_user: true, token: botToken, channel, text }, extra))
    .then(({ ok }) => ok)
}

const mainMenuActions = [
  {
    text: 'Link you to GitHub',
    type: 'button',
    name: actions.link,
    value: JSON.stringify(null),
  },
  {
    text: 'Undo link',
    type: 'button',
    name: actions.unlink,
    value: JSON.stringify(null),
  },
  {
    text: 'Setup GitHub projects',
    type: 'button',
    name: actions.getWebhook,
    value: JSON.stringify(null),
  },
  {
    text: 'Feedback',
    type: 'button',
    name: actions.feedback,
    value: JSON.stringify(null),
  },
]

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
  const { botID } = await db.loadWorkspace(workspace)

  if (botID === data.event.user) {
    // ignore message from this app
    return
  }

  if (!data.event.user) {
    // might be beautified message, ignore
    return
  }

  await botSpeak(workspace, data.event.channel, '', {
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

const interactiveMessageTypes = {
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
    const {
      team: { id: workspace },
      user: { id: slackUserID },
      channel: { id: channelID },
      type: interactiveMessageType,
    } = payload
    switch (interactiveMessageType) {
      case interactiveMessageTypes.interactiveMessage: {
        // Slack doc says there would be only one action:
        // https://api.slack.com/docs/interactive-message-field-guide "Action URL invocation payload"
        const {
          actions: [{ name: action, value }],
        } = payload

        const state = createInitialState(action, value)

        switch (action) {
          case actions.feedback: {
            await botSpeak(
              workspace,
              channelID,
              `📝 If you have any question, feature request or bug report, please <https://github.com/EnixCoda/github-code-review-notifier/issues/new|draft an issue>.`,
            )
            return
          }
          case actions.getWebhook: {
            const url = getURL(req)
            const webhook = generateWebhookURL(url.host, workspace)
            await botSpeak(
              workspace,
              channelID,
              `🔧 Please setup your GitHub projects with this webhook:\n${webhook}\n\nNeed help? Read the <https://enixcoda.github.io/github-code-review-notifier/#connect-github-projects|connect GitHub projects> section.`,
            )
            return
          }
          case actions.link:
          case actions.unlink: {
            const { botToken } = await db.loadWorkspace(workspace)
            const links = await db.loadLinks(workspace, { slack: slackUserID })
            const githubNames = links ? links.map(({ github }) => github) : null

            if (action === actions.unlink) {
              if (!githubNames) {
                await botSpeak(
                  workspace,
                  channelID,
                  `👻 Hi <@${slackUserID}>, you are not linked to any GitHub users yet. You can get started by clicking "Link to GitHub" on the left.`,
                )
              } else {
                await openUnlinkDialog(botToken, payload, githubNames)
              }
            } else {
              await openLinkDialog(botToken, payload, githubNames || undefined, state)
            }
            return
          }
          case actions.linkOtherUser: {
            const { githubName } = state
            if (typeof githubName !== 'string') throw new Error('Unexpected state')

            const { botToken } = await db.loadWorkspace(workspace)
            await openLinkForOtherDialog(botToken, payload, githubName, { githubName })

            return
          }
          default:
            break
        }
        return
      }
      case interactiveMessageTypes.dialogSubmission: {
        const { submission = {} } = payload
        const { action, state } = parseState(payload.state)

        const githubName =
          (state && state.githubName) || submission.githubName || submission.github_name
        const targetSlackUserID =
          (state && state.slackUserID) ||
          (submission.slackUser && submission.slackUser.id) ||
          slackUserID

        let responseMessage: string
        switch (action) {
          case actions.linkOtherUser:
          case actions.link: {
            // TODO: prevent duplication
            const succeeded = await db.saveLink(workspace, {
              github: githubName,
              slack: targetSlackUserID,
            })
            if (succeeded)
              responseMessage = `🤝 Linked <@${targetSlackUserID}> to <https://github.com/${githubName}|${githubName}>!`
            else responseMessage = `Oops, link failed. You may try again later.`
            break
          }
          case actions.unlink: {
            const succeeded = await db.removeLink(workspace, { github: githubName })
            if (succeeded)
              responseMessage = `👋 Unlinked <@${targetSlackUserID}> from <https://github.com/${githubName}|${githubName}>!`
            else responseMessage = `Sorry, unlink failed.`
            break
          }
          default:
            throw `unknown command ${action}`
        }

        await botSpeak(workspace, channelID, responseMessage)

        return
      }
      default:
        console.log(`unknown payload type`, data.payload)
    }
  } else {
    console.log(`no payload detected`)
  }
}

function createInitialState(name: string, value: string) {
  const state: {
    [key: string]: ExpectedAny
  } = {}
  if (Object.values(actions).includes(value)) {
    // legacy message, leave state empty
  } else {
    // might be latest JSON serialized message
    try {
      Object.assign(state, JSON.parse(value))
    } catch (err) {
      throw new Error(`Unknown interactive message: ${JSON.stringify({ name, value })}`)
    }
  }
  return state
}

function parseState(state: string) {
  if (Object.values(actions).includes(state)) {
    // legacy mode
    return {
      action: state,
    }
  } else {
    try {
      return JSON.parse(state)
    } catch (err) {
      throw new Error(`Unknown interactive submission state: ${state}`)
    }
  }
}

async function openSlackDialog(
  botToken: string,
  payload: SlackPayload,
  action: string,
  state: ExpectedAny,
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
      state: JSON.stringify({
        action,
        state,
      }),
      elements,
    },
  })
  return ok
}

function openLinkForOtherDialog(
  botToken: string,
  payload: any,
  githubName: string,
  state: { githubName: string },
) {
  const elements = [
    {
      label: `User of ${githubName}`,
      name: 'slackUser',
      type: 'select',
      hint: `Which Slack user owns ${githubName} on GitHub?`,
      data_source: 'users',
    },
  ]
  return openSlackDialog(
    botToken,
    payload,
    actions.linkOtherUser,
    state,
    `Link for ${githubName}`,
    elements,
  )
}

function openLinkDialog(
  botToken: string,
  payload: SlackPayload,
  githubNames?: string[],
  state?: {
    githubName?: string
  },
) {
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
  return openSlackDialog(botToken, payload, actions.link, state, `Link to GitHub`, elements)
}

function openUnlinkDialog(
  botToken: string,
  payload: SlackPayload,
  githubNames: string[],
  state?: {
    githubName?: string
  },
) {
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
  return openSlackDialog(botToken, payload, actions.unlink, state, `Undo link`, elements)
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
