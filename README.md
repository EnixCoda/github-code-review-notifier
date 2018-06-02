# GitHub Reviewer Notification for Slack

## Why one more Slack App for GitHub?
I know there are already lots of Slack Apps which are used to send notifications about something happens on GitHub to Slack.

But I did not found one with such simple requirement (or maybe it's too hard to find the existing ones), which is, **notify me when I was requested as reviewer**.

## What could it do?
After adding the app into Slack workspace and setting up webhook on GitHub, users can
1. Link Slack account to GitHub account according to username by one simple command: `/link [GitHubUserName]`, e.g. `/link EnixCoda`.
2. When the user is requested as reviewer of a pull request on GitHub, he/she will be notified on Slack immediately! And with the link provided in the message, it will be very easy to check out the PR!

## A picture worths thousands of words
![](https://user-images.githubusercontent.com/7480839/40874057-05385f84-669d-11e8-94d4-7aa9778df06b.png)

## How to use
> I'm sorry that for this demo version it takes a little bit many steps to set up. I may make it easier someday.

1. Set up a [now.sh](https://now.sh) account and figure out how to deploy an app to now.sh (just run `now`).

1. Create an Slack App, enable `Incoming Webhooks`.

1. Create a [firebase](https://firebase.google.com) app, enable real time database. Then copy firebase config of your app from `Project Overview` - `Add Firebase to your web app` into `config.js`.

1. Copy the Slack App's webhooks URL into `config.js`.

1. Deploy the app with `now`. Copy the URL of your deployed instance.

1. Add Webhook in your GitHub repo, with URL set to the one you just copied above.

1. Enable `Slash Commands` for your Slack App, with its `name` set to `link` and URL set to the same as above.

1. Done! Enjoy it!
