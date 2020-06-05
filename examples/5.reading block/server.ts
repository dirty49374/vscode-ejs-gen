// {{{ CONFIG
/*
rpcs:
- Ping
*/
// }}} CONFIG

import { PingRequest, PingResponse, PingHandler } from './ping';

export interface IRpcServer {
    Ping(req: PingRequest): Promise<PingResponse>;
}

export class RpcServer implements IRpcServer {
    Ping = PingHandler;
}
