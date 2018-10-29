# GitHub Reviewer Notifier on Slack

When requested to review pull request on GitHub, you will be notified on Slack immediately! And a direct link to the Pull Request will be provided in the message.

## A picture is worths a thousand words
### Easy to setup
![](https://user-images.githubusercontent.com/7480839/47544419-872bbb00-d919-11e8-82cc-73803f9ea8d3.png)

### Be notified on Slack in time
![](https://user-images.githubusercontent.com/7480839/47544416-8135da00-d919-11e8-9083-6319f6c1d10a.png)

## How to set up
1. Click the button below to Authorize.

    <a href="https://slack.com/oauth/authorize?client_id=358699124487.462026355174&scope=chat:write:bot,bot" target="_blank"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

2. Then you could find @CodeReviewNotifier in your workspace. Talk to it, it will provide you the menu.

3. Click `Get webhook URL for GitHub` in the menu, and create a webhook with it in your GitHub project.

4. Click `Link` in the menu to link your accounts to get in touch. Also, don't forget to tell your team about this tool.

## More details
1. [How to create GitHub webhook?](https://developer.github.com/webhooks/creating/)

1. You can grant less events except the `Pull requests` to the webhook on GitHub in order to expose less info to this App.

1. This App is deployed on now.sh and stores data on firebase, on a free plan. So every line of code running online is visible to everyone, transparent and safe.

1. You can deploy this App in your own way. (TODO: deploy instructions under constructions)

## Why one more Slack App for GitHub?
I know there are already lots of Slack Apps which are used to send notifications about something happens on GitHub to Slack.

But I did not found one with such simple requirement (or maybe it's too hard to find the existing ones), which is, **notify me when I was requested as reviewer**.

However, now there is another tool, [loolp](https://slack.com/apps/A98B3DYP2-loolp), providing similar functionalities. But it requires your OAuth permissions to manipulate your GitHub account or code while my App does not.
