import { handleGitHubHook } from '../src/github'
import { requestHandler } from '../src/index'

export default requestHandler(handleGitHubHook)
