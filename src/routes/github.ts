import { handleGitHubHook } from '../github'
import { requestHandler } from '../index'

export default requestHandler(handleGitHubHook)
