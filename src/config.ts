require('now-env')
const { FIREBASE, BOT_TOKEN, VERIFICATION_TOKEN, CLIENT_SECRET, SIGNING_SECRET, CLIENT_ID } = process.env

if (!FIREBASE) throw Error('missing Firebase')
if (!VERIFICATION_TOKEN) throw Error('missing Slack App verification token')
if (!CLIENT_SECRET) throw Error('missing client secret')
if (!SIGNING_SECRET) throw Error('missing signing secret')

const firebaseConfig = JSON.parse(Buffer.from(FIREBASE, 'base64').toString())

export default {
  firebaseConfig,
  verificationToken: VERIFICATION_TOKEN,
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  signingSecret: SIGNING_SECRET,
}
