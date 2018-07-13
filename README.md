# GitHub Reviewer Notification for Slack

## Why one more Slack App for GitHub?
I know there are already lots of Slack Apps which are used to send notifications about something happens on GitHub to Slack.

But I did not found one with such simple requirement (or maybe it's too hard to find the existing ones), which is, **notify me when I was requested as reviewer**.

## What could it do?
After adding the app into Slack workspace and setting up webhook on GitHub, users can
1. Link Slack account to GitHub account according to username by one simple command: `/link [GitHubUserName]`, e.g. `/link EnixCoda`.
2. When the user is requested as reviewer of a pull request on GitHub, he/she will be notified on Slack immediately! And with the link provided in the message, it will be very easy to check out the PR!

## A picture worths a thousand words
![](https://user-images.githubusercontent.com/7480839/40874057-05385f84-669d-11e8-94d4-7aa9778df06b.png)

## How to set up

1. Add a Webhook in your GitHub repo (set content type to `application/json`).

1. Customize your Slack workspace, create a Slack App with `Incoming Webhooks` and `Slash Commands` enabled. For the later one, its `name` should be set to `link`.

1. Create a [firebase](https://firebase.google.com) App with real time database enabled. Find firebase config of your app from `Project Overview` - `Add Firebase to your web app`, convert the `config` into JSON.
    > Use firebase for storage. You can use any other methods you prefer. Modify src/db.js to achieve that.

1. Set configs and deploy.
    ```
    # I'd recommend now.sh (https://now.sh).
    # set `now secrets` for Firebase configs and Slack App `Incoming Webhooks` URL.
    $ now secrets add SLACK "[the Incoming Webhooks URL you got at step 2]"
    $ now secrets add FIREBASE $(echo '[firebase config JSON string you got at step 3]' | base64)
    $ now --public

    # If you'd like to deploy in other way, please set ENV according to `src/config.js`.
    ```

1. Set URL of GitHub webhook and Slack `Slash Commands` to the instance you just deployed.

Done! Enjoy it!
