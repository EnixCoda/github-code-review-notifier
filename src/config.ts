import 'now-env'

const {
  FIREBASE,
  BOT_TOKEN,
  VERIFICATION_TOKEN,
  CLIENT_SECRET,
  SIGNING_SECRET,
  CLIENT_ID,
} = process.env

if (!FIREBASE) throw Error('missing Firebase')
if (!VERIFICATION_TOKEN) throw Error('missing Slack App verification token')
if (!CLIENT_SECRET) throw Error('missing client secret')
if (!SIGNING_SECRET) throw Error('missing signing secret')

export const firebaseConfig = JSON.parse(Buffer.from(FIREBASE, 'base64').toString())
export const verificationToken = VERIFICATION_TOKEN
export const clientID = CLIENT_ID
export const clientSecret = CLIENT_SECRET
export const signingSecret = SIGNING_SECRET
