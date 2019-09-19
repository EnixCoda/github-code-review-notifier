import { handleOAuth } from '../src/bot'
import { requestHandler } from '../src/index'

export default requestHandler(handleOAuth)
