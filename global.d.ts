type ExpectedAny = any

// GitHub-Slack Link
type GSLink = {
  slack: string // Slack ID
  github: string // GitHub username
}

type WorkspaceMeta = {
  accessToken: string
  botToken: string
  botID: string
}

type Schema = {
  registered: {
    [workspace: string]: WorkspaceMeta
  }
  link: {
    [workspace: string]: GSLink[]
  }
}

type SlackPayload = any
type SlackElement = any
