const { handleInteractiveComponents } = require('../bot')
const { requestHandler } = require('../index')

module.exports = requestHandler(handleInteractiveComponents)
