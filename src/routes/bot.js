const { handleBotMessages } = require('../bot')
const { requestHandler } = require('../index')

module.exports = requestHandler(handleBotMessages)
