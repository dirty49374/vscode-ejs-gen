// server

/* {{{ CONFIG
rpcs:
  - Ping

    }}} */

import { PingRequest, PingResponse, PingHandler } from './ping';

export interface IRpcServer {
    Ping(req: PingRequest): Promise<PingResponse>;
}

export class RpcServer implements IRpcServer {
// {{{ IMPLEMENTATION

  Ping = PingHandler;
// }}}

}
