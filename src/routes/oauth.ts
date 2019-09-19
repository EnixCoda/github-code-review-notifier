import { handleOAuth } from '../bot'
import { requestHandler } from '../index'

export default requestHandler(handleOAuth)
