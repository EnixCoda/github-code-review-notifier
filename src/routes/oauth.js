const { handleOAuth } = require('../bot')
const { requestHandler } = require('../index')

module.exports = requestHandler(handleOAuth)
