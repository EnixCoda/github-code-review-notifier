import firebase from 'firebase'
import { firebaseConfig } from './config'
import { dePromiseLike } from './utils'

// initialize and basic operations

const app = firebase.initializeApp(firebaseConfig)
const database = app.database()

type RefPath = string

function getRef(path: RefPath) {
  return database.ref(path)
}

function add<T>(path: RefPath, value: T) {
  return dePromiseLike(getRef(path).push(value))
}

function set<T>(path: RefPath, value: T) {
  return getRef(path).set(value)
}

function remove(path: RefPath) {
  return getRef(path).remove()
}

async function get<T>(path: RefPath) {
  const snapshot = await getRef(path).once('value')
  return snapshot.val() as T | null
}

function find(path: RefPath, key: string, value: string | number | boolean | null) {
  return getRef(path)
    .orderByChild(key)
    .equalTo(value)
}

// database model helpers

const keys = {
  registered: `registered`,
  link: `link`,
  slackUserID: `slack`,
  githubName: `github`,
  log: `logs`,
}

const paths: {
  [key: string]: (seed: string) => string
} = {
  registered: workspace => `${keys.registered}/${workspace}`,
  link: workspace => `${keys.link}/${workspace}`,
}

// business logics

export function saveLink(workspace: string, link: GSLink) {
  return add(paths.link(workspace), link)
}

function getGitHubLinkQuery(workspace: string, github: GSLink['github']) {
  return find(paths.link(workspace), keys.githubName, github)
}

function getSlackLinkQuery(workspace: string, slack: GSLink['slack']) {
  return find(paths.link(workspace), keys.slackUserID, slack)
}

function getLinkQuery(workspace: string, link: Pick<GSLink, 'github'> | Pick<GSLink, 'slack'>) {
  let query: firebase.database.Query
  if ('github' in link) query = getGitHubLinkQuery(workspace, link.github)
  else if ('slack' in link) query = getSlackLinkQuery(workspace, link.slack)
  else throw new Error('Unexpected link: ' + JSON.stringify(link))
  return query
}

export async function removeLink(
  workspace: string,
  link: Pick<GSLink, 'github'> | Pick<GSLink, 'slack'>,
) {
  const query: firebase.database.Query = getLinkQuery(workspace, link)

  const snapshot = await query.limitToFirst(1).once('value')
  if (snapshot.exists()) {
    const promisesOfRemove: Promise<ExpectedAny>[] = []
    snapshot.forEach(child => {
      promisesOfRemove.push(child.ref.remove())
    })
    return Promise.all(promisesOfRemove)
  }
}

export async function loadLinks(
  workspace: string,
  link: Pick<GSLink, 'github'> | Pick<GSLink, 'slack'>,
) {
  const query: firebase.database.Query = getLinkQuery(workspace, link)

  const snapshot = await query.once('value')
  if (snapshot.exists()) {
    return Object.values(snapshot.val() as {
      [key: string]: GSLink
    })
  }
}

export async function loadWorkspace(workspace: string) {
  const value = await get<WorkspaceMeta>(paths.registered(workspace))
  if (value === null) throw new Error(`Cannot find workspace "${workspace}"`)
  return value
}

export function createWorkspace(workspace: string, workspaceMeta: WorkspaceMeta) {
  return set(paths.registered(workspace), workspaceMeta)
}

export function log(content: { [key: string]: string | undefined }) {
  return getRef(keys.log).push(content)
}
