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

export async function load<T>(ref: RefSeed) {
  const snapshot = await getRef(ref).once('value')
  return snapshot.val() as T | null
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
        const promisesOfRemove: Promise<boolean>[] = []
        snapshot.forEach(child => {
          promisesOfRemove.push(child.ref.remove())
        })
        return Promise.all(promisesOfRemove).then(() => true)
      }
      return true
    })
}

export async function loadLinks(
  workspace: string,
  link: Pick<GSLink, 'github'> | Pick<GSLink, 'slack'>,
) {
  let query: firebase.database.Query

  if ('github' in link) {
    query = getGitHubLinkQuery(workspace, { github: link.github })
  } else if ('slack' in link) {
    query = getSlackLinkQuery(workspace, { slack: link.slack })
  } else {
    throw new Error('Neither github nor slack was provided!')
  }
  const snapshot = await query.once('value')
  return snapshot.exists()
    ? Object.values(snapshot.val() as {
        [key: string]: GSLink
      })
    : null
}

export async function loadWorkspace(workspace: string) {
  const val = await load<WorkspaceMeta>(paths.registered(workspace))
  if (!val) throw new Error(`Cannot find workspace "${workspace}"`)
  return val
}

export async function createWorkspace(
  workspace: string,
  { botID, botToken, accessToken }: WorkspaceMeta,
) {
  await save(paths.registered(workspace), { botID, botToken, accessToken })
  return true
}

export async function log(content: { [key: string]: string | undefined }) {
  return await getRef(keys.log)
    .push(content)
    .then(() => true)
}
