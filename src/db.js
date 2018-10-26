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
  slackUserID: `slack`,
  githubName: `github`,
}

const paths = {
  registered: workspace => `${keys.registered}/${workspace}`,
  link: workspace => `${keys.link}/${workspace}`,
}

exports.paths = paths

function getRef(ref) {
  return firebase.database().ref(ref)
}

function save(ref, value) {
  return getRef(ref).set(value)
}
exports.save = save

function remove(ref) {
  return getRef(ref).remove()
}
exports.remove = remove

function load(ref) {
  return getRef(ref)
    .once('value')
    .then(snapshot => snapshot.val())
}
exports.load = load

function saveLink(workspace, { githubName, slackUserID }) {
  return getRef(paths.link(workspace))
    .push({
      [keys.slackUserID]: slackUserID,
      [keys.githubName]: githubName,
    })
    .then(() => true)
    .catch(err => {
      console.error(err)
      return false
    })
}
exports.saveLink = saveLink

function genLinkQuery(workspace, { githubName, slackUserID }) {
  let key, value
  if (githubName) {
    key = keys.githubName
    value = githubName
  } else if (slackUserID) {
    key = keys.slackUserID
    value = slackUserID
  } else throw Error(`cannot load link without githubName and slackUserID`)

  return getRef(paths.link(workspace))
    .orderByChild(key)
    .equalTo(value)
}

function removeLink(workspace, { githubName, slackUserID }) {
  return genLinkQuery(workspace, { githubName, slackUserID })
    .limitToFirst(1)
    .once('value')
    .then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.forEach(child =>
          child
            .ref
            .remove()
            .then(() => true)
            .catch(err => {
              console.error(err)
              return false
            })
        )
      }
      return true
    })
}
exports.removeLink = removeLink

function loadLinks(workspace, { githubName, slackUserID }) {
  return genLinkQuery(workspace, { githubName, slackUserID })
    .once('value')
    .then(snapshot => (snapshot.exists() ? Object.values(snapshot.val()) : null))
}
exports.loadLinks = loadLinks

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
