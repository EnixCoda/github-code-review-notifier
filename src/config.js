const slackIncomingWebhooksURL = ''

module.exports = {
  firebase: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
  },
  slack: {
    hook: {
      URL: {
        hostname: slackIncomingWebhooksURL.replace(/https?:\/\/(.*?)\/.*$/, '$1'),
        path: slackIncomingWebhooksURL.replace(/https?:\/\/.*?(\/.*)$/, '$1'),
      }
    }
  }
}
