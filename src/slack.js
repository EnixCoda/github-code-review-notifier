const https = require('https')
const { slackEndpoint } = require('./config')
const formatForSlackAPI = content => JSON.stringify({ text: content })

const sendToSlack = content =>
  new Promise((resolve, reject) => {
    const reqContent = formatForSlackAPI(content)
    const options = {
      ...slackEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqContent),
      },
    }
    const req = https.request(options, res => {
      res.on('data', () => {})
      res.on('end', () => resolve())
    })

    req.on('error', reject)
    req.write(reqContent)
    req.end()
  })

module.exports = {
  send: sendToSlack,
}
