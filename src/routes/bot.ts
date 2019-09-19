import { handleBotMessages } from '../bot'
import { requestHandler } from '../index'

export default requestHandler(handleBotMessages)
