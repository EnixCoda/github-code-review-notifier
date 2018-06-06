const firebase = require('firebase')
const { firebaseConfig } = require('./config')
firebase.initializeApp(firebaseConfig)

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

const linkDocument = 'name-links'

function saveLink(gitHubName, slackUserID) {
  return save(`/${linkDocument}/${gitHubName}`, slackUserID)
}

function loadLink(gitHubName) {
  return load(`/${linkDocument}/${gitHubName}`)
}

module.exports = {
  save,
  load,
  saveLink,
  loadLink,
}
