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

type MetricName = 'success' | 'errors' | 'slack_sent'

type Metric = {
  count: number
  last_time: number
}

type Schema = {
  registered: {
    [workspace: string]: WorkspaceMeta
  }
  link: {
    [workspace: string]: GSLink[]
  }
  metrics: {
    [name: string]: Metric
  }
}

type SlackPayload = any
type SlackElement = any
