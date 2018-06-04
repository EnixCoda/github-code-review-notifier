require('now-env')
const { FIREBASE, SLACK } = process.env

const firebaseConfig = JSON.parse(Buffer.from(FIREBASE, 'base64').toString())
const slackEndpoint = {
  hostname: SLACK.replace(/https?:\/\/(.*?)\/.*$/, '$1'),
  path: SLACK.replace(/https?:\/\/.*?(\/.*)$/, '$1'),
}

module.exports = {
  firebaseConfig,
  slackEndpoint,
}
