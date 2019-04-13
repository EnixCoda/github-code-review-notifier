# GitHub Reviewer Notifier on Slack

When requested to review pull request on GitHub or when your pull request has been approved, you will be notified on Slack immediately! And a direct link to the Pull Request will be provided in the message.

## A picture is worths a thousand words

### Easy to setup

![](https://user-images.githubusercontent.com/7480839/56017414-c3b96a80-5d31-11e9-887a-d63e213e7def.png)

### Be notified on Slack in time

![](https://user-images.githubusercontent.com/7480839/56017581-4fcb9200-5d32-11e9-93dc-bd9f3b25a4d0.png)

## How to set up

1. Click the button below to Authorize.

   <a href="https://slack.com/oauth/authorize?client_id=358699124487.462026355174&scope=chat:write:bot,bot" target="_blank"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

2. Then you will find `@GitHub Code Review Notifier` added into your workspace. Talk to it to setup.

3. Click `Get webhook URL for GitHub` in the menu, and create a webhook with it in your GitHub projects.

> Multiple projects can share one URL in a workspace.
> [How to create GitHub webhook?](https://developer.github.com/webhooks/creating/)

4. Click `Link` from menu to link your accounts. Only linked users will get notifications. So don't forget to tell your team about this tool.

## More details

1. You can grant only `Pull requests` and `Pull request reviews` to the webhook in order to expose less info to this App. Even if you granted all, this App will ignore others anyway, no worries :)

1. This App is **serverless**, deployed on now.sh and stores data on firebase. So every line of code running online is visible to everyone, transparent and safe.
