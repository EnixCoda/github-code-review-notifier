import { handleBotMessages } from '../src/bot'
import { requestHandler } from '../src/index'

export default requestHandler(handleBotMessages)
