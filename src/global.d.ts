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

type Log = {
  time?: string
  path?: string
  info?: string
  data?: ExpectedAny
}

type Schema = {
  registered: {
    [workspace: string]: WorkspaceMeta
  }
  link: {
    [workspace: string]: GSLink[]
  }
  log: {
    [workspace: string]: Log[]
  }
}

type SlackPayload = any
type SlackElement = any
