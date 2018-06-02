const firebase = require('firebase')
const config = require('./config')

firebase.initializeApp(config.firebase)

function save(ref, value) {
  return firebase
    .database()
    .ref(ref)
    .set(value)
}

function load(ref) {
  return firebase
    .database()
    .ref(ref)
    .once('value')
    .then(snapshot => snapshot.val())
}

function saveLink(gitHubName, slackUserID) {
  return save(`name-links/${githubName}`, slackUserID)
}

function loadLink(githubName) {
  return load(`/name-links/${githubName}`)
}

module.exports = {
  save,
  load,
  saveLink,
  loadLink,
}
