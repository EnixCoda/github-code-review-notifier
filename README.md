# GitHub Reviewer Notifier on Slack

When requested to review pull request on GitHub or when your pull request has been approved, you will be notified on Slack immediately! And a direct link to the Pull Request will be provided in the message.

## A picture is worths a thousand words

![](https://user-images.githubusercontent.com/7480839/56017581-4fcb9200-5d32-11e9-93dc-bd9f3b25a4d0.png)

## Setup

### Connect Slack workspace

1. To add `@GitHub Code Review Notifier` to your workspace, click the button below to Authorize.

   <a href="https://slack.com/oauth/authorize?client_id=358699124487.462026355174&scope=chat:write:bot,bot" target="_blank"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

2. Then you could find `@GitHub Code Review Notifier` in your workspace.

3. Say anything (e.g. `hi`) to it to get **menu**.

### Connect GitHub account

Click `Link` in the menu to link your GitHub account to the Slack workspace. Only linked users will get notifications. So don't forget to tell your teammates about this tool.

### Connect GitHub projects

You can click `Setup GitHub projects` in the menu to get a webhook for connecting your GitHub projects.

- [How to use GitHub webhook?](https://developer.github.com/webhooks/creating/)
- The events sent to it should at least include `Pull requests` and `Pull request reviews`. Or `Send me everything` for easier setup.
- The URL is bound to the workspace. And multiple projects can share one URL in one Slack workspace.
