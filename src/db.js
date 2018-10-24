const firebase = require('firebase')
const { firebaseConfig } = require('./config')

firebase.initializeApp(firebaseConfig)

/**
 * database schema
 *
 * {
 *   registered: {
 *     [workspace]: true,
 *   },
 *   link: {
 *     [workspace]: {
 *       [githubName]: [slackID],
 *     },
 *   },
 * }
 */

const keys = {
  registered: `registered`,
  link: `link`,
}

const paths = {
  registered: workspace => `${keys.registered}/${workspace}`,
  link: workspace => `${keys.link}/${workspace}`,
  linkID: (workspace, githubName) => `${keys.link}/${workspace}/${githubName}/`,
}

exports.paths = paths

function save(ref, value) {
  return firebase
    .database()
    .ref(ref)
    .set(value)
}
exports.save = save

function remove(ref) {
  return firebase
    .database()
    .ref(ref)
    .remove()
}
exports.remove = remove

function load(ref) {
  return firebase
    .database()
    .ref(ref)
    .once('value')
    .then(snapshot => snapshot.val())
}
exports.load = load

function saveLink(workspace, gitHubName, slackID) {
  return save(paths.linkID(workspace, gitHubName), slackID)
    .then(() => true)
    .catch(err => {
      console.error(err)
      return false
    })
}
exports.saveLink = saveLink

function removeLink(workspace, gitHubName) {
  return remove(paths.linkID(workspace, gitHubName))
    .then(() => true)
    .catch(err => {
      console.error(err)
      return false
    })
}
exports.removeLink = removeLink

function loadLink(workspace, { githubName, slackUserID }) {
  return load(paths.linkID(workspace, githubName))
}
exports.loadLink = loadLink

function createWorkspace(workspace) {
  return load(paths.registered(workspace)).then(exist => {
    if (exist) {
      return true
    } else {
      return save(paths.registered(workspace), true).then(() => true)
    }
  })
}
exports.createWorkspace = createWorkspace
