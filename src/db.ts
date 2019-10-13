import firebase from 'firebase'
import { firebaseConfig } from './config'
import { dePromiseLike } from './utils'

firebase.initializeApp(firebaseConfig)

const keys = {
  registered: `registered`,
  link: `link`,
  slackUserID: `slack`,
  githubName: `github`,
  accessToken: `accessToken`,
  botToken: `botToken`,
  botID: `botID`,
  log: `logs`,
}

const paths: {
  [key: string]: (seed: string) => string
} = {
  registered: workspace => `${keys.registered}/${workspace}`,
  link: workspace => `${keys.link}/${workspace}`,
}

type RefSeed = string

function getRef(ref: RefSeed) {
  return firebase.database().ref(ref)
}

export function save<T>(ref: RefSeed, value: T) {
  return getRef(ref).set(value)
}

export function remove(ref: RefSeed) {
  return getRef(ref).remove()
}

export function load<T>(ref: RefSeed) {
  return getRef(ref)
    .once('value')
    .then(snapshot => snapshot.val() as T | null)
}

export function saveLink(workspace: string, { github, slack }: GSLink) {
  return dePromiseLike(
    getRef(paths.link(workspace))
      .push({
        [keys.slackUserID]: slack,
        [keys.githubName]: github,
      })
      .then(() => true),
  )
}

function getGitHubLinkQuery(workspace: string, { github }: Pick<GSLink, 'github'>) {
  return getRef(paths.link(workspace))
    .orderByChild(keys.githubName)
    .equalTo(github)
}

function getSlackLinkQuery(workspace: string, { slack }: Pick<GSLink, 'slack'>) {
  return getRef(paths.link(workspace))
    .orderByChild(keys.slackUserID)
    .equalTo(slack)
}

export function removeLink(workspace: string, { github }: Pick<GSLink, 'github'>) {
  return getGitHubLinkQuery(workspace, { github })
    .limitToFirst(1)
    .once('value')
    .then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.forEach(child => {
          child.ref.remove().then(() => true)
        })
      }
      return true
    })
}

export function loadLinks(workspace: string, { github, slack }: Partial<GSLink>) {
  let ref
  if (github) {
    ref = getGitHubLinkQuery(workspace, { github })
  } else if (slack) {
    ref = getSlackLinkQuery(workspace, { slack })
  } else {
    throw new Error('')
  }
  return ref.once('value').then(snapshot =>
    snapshot.exists()
      ? Object.values(snapshot.val() as {
          [key: string]: GSLink
        })
      : null,
  )
}

export function loadWorkspace(workspace: string) {
  return load<WorkspaceMeta>(paths.registered(workspace)).then(val => {
    if (!val) throw new Error(`cannot find workspace "${workspace}"`)
    return val
  })
}

export function createWorkspace(
  workspace: string,
  { botID, botToken, accessToken }: WorkspaceMeta,
) {
  return save(paths.registered(workspace), { botID, botToken, accessToken }).then(() => true)
}

export async function log(path: string, data: string) {
  await save(keys.log, { path, data })
  return true
}
