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

2. Then you could find `@GitHub Code Review Notifier` in your workspace. Say `hi` to it to begin.

3. Click `Get webhook URL for GitHub` in the response menu and create webhook with it in your GitHub projects.

   > The events sent to it should at least include `Pull requests` and `Pull request reviews`. I'd recommend pick `Send me everything` to make your life easier :)

   > Multiple projects can share one URL in one Slack workspace.
   > [How to create GitHub webhook?](https://developer.github.com/webhooks/creating/)

4. Click `Link` from menu to link your accounts as only linked users will get notifications. Don't forget to tell your teammates about this tool.

## More details

1. This App is **serverless**, deployed on now.sh and stores data on firebase. So every line of code running online is public, transparent and safe.
