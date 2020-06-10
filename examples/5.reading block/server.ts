// server

/* {{{ CONFIG
rpcs:
  - Ping
  - Pong

    }}} */

import { PingRequest, PingResponse, PingHandler } from './ping';
import { PongRequest, PongResponse, PongHandler } from './pong';

export interface IRpcServer {
    Ping(req: PingRequest): Promise<PingResponse>;
    Pong(req: PongRequest): Promise<PongResponse>;
}

export class RpcServer implements IRpcServer {
// {{{ IMPLEMENTATION

  Ping = PingHandler;
  async Pong(req: PongRequest): Promise<PongResponse> {
      console.log(req);
      return PongHandler(req);
  }
// }}}

}
