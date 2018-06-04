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
  return save(`name-links/${gitHubName}`, slackUserID)
}

function loadLink(gitHubName) {
  return load(`/name-links/${gitHubName}`)
}

module.exports = {
  save,
  load,
  saveLink,
  loadLink,
}
