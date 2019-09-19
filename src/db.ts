import firebase from 'firebase'
import { firebaseConfig } from './config'

firebase.initializeApp(firebaseConfig)

/**
 * database schema
 *
 * {
 *   registered: {
 *     [workspace]: {
 *       [keys.accessToken]: [accessToken],
 *       [keys.botToken]: [botToken],
 *       [keys.botID]: [botID],
 *     },
 *   },
 *   link: {
 *     [workspace]: [
 *       {
 *         [keys.slackUserID]: [githubName],
 *         [keys.githubName]: [slackID],
 *       },
 *     ],
 *   },
 * }
 */

const keys = {
  registered: `registered`,
  link: `link`,
  slackUserID: `slack`,
  githubName: `github`,
  accessToken: `accessToken`,
  botToken: `botToken`,
  botID: `botID`,
}

export const paths = {
  registered: workspace => `${keys.registered}/${workspace}`,
  link: workspace => `${keys.link}/${workspace}`,
}

function getRef(ref) {
  return firebase.database().ref(ref)
}

export function save(ref, value) {
  return getRef(ref).set(value)
}

export function remove(ref) {
  return getRef(ref).remove()
}

function loadVal(ref) {
  return getRef(ref)
    .once('value')
    .then(snapshot => snapshot.val())
}
export const load = loadVal

export function saveLink(workspace, { githubName, slackUserID }) {
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

export function removeLink(workspace, { githubName, slackUserID }) {
  return genLinkQuery(workspace, { githubName, slackUserID })
    .limitToFirst(1)
    .once('value')
    .then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.forEach(child =>
          child.ref
            .remove()
            .then(() => true)
            .catch(err => {
              console.error(err)
              return false
            }),
        )
      }
      return true
    })
}

export function loadLinks(workspace, { githubName, slackUserID }) {
  return genLinkQuery(workspace, { githubName, slackUserID })
    .once('value')
    .then(snapshot => (snapshot.exists() ? Object.values(snapshot.val()) : null))
}

export function loadWorkspace(workspace) {
  return loadVal(paths.registered(workspace)).then(val => {
    if (!val) throw null
    return val
  })
}

export function createWorkspace(workspace, { botID, botToken, accessToken }) {
  return save(paths.registered(workspace), { botID, botToken, accessToken }).then(() => true)
}
