import { NowRequest, NowResponse } from '@now/node'

export type IncomingMessage = NowRequest

export type RequestListener = (req: NowRequest, res: NowResponse) => void
