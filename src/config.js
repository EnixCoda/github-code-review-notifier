require('now-env')
const { FIREBASE, BOT_TOKEN, VERIFICATION_TOKEN } = process.env

if (!FIREBASE) throw Error('missing Firebase')
if (!BOT_TOKEN) throw Error('missing bot token')
if (!VERIFICATION_TOKEN) throw Error('missing Slack App verification token')

const firebaseConfig = JSON.parse(Buffer.from(FIREBASE, 'base64').toString())

module.exports = {
  firebaseConfig,
  botToken: BOT_TOKEN,
  verificationToken: VERIFICATION_TOKEN,
}
