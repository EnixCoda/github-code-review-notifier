const { handleGitHubHook } = require('../github')
const { requestHandler } = require('../index')

module.exports = requestHandler(handleGitHubHook)
