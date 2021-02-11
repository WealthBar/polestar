import {
  ctxWsType,
  reqHandlerType,
  requestType,
  serverSettingsType,
  webSocketExtendedType,
  wsHandlerType,
} from './server.type';
import {IncomingMessage, Server} from 'http';
import * as WebSocket from 'ws';
import {Socket} from 'net';
import {ctxReqCtor, parseCookie} from './ctx';
import {readonlyRegistryType, registryCtor} from 'ts_agnostic';
import {serializableType} from 'ts_agnostic';
import {tuidCtor} from 'ts_agnostic';
import {dbProviderType, sessionCreate} from './db';

export type wsType = {
  wss: WebSocket.Server,
  call(ctxWs: ctxWsType, callName: string, params: serializableType): Promise<serializableType>;
};

export function wsInit(
  wsHandlerRegistry: readonlyRegistryType<wsHandlerType>,
  wsOnConnectHandler: (ctxWs: ctxWsType) => Promise<serializableType>,
  wsOnCloseHandler: (ctxWs: ctxWsType) => Promise<serializableType>,
  server: Server,
  settings: serverSettingsType,
  sessionInit: reqHandlerType,
  dbProvider: dbProviderType): wsType {
  const wss = new WebSocket.Server({
    noServer: true,
    backlog: 32,
  });

  function heartbeat() {
    console.log('heartbeat');
    this.isAlive = true;
  }

  async function fromRemote(ctxWs: ctxWsType, data: string): Promise<void> {
    try {
      const i: { id?: string; n?: string; a?: serializableType, s?: string, e?: serializableType, r?: serializableType } = JSON.parse(data);
      const ss = i.s?.[0];
      if (i.id && i.n && ss === '?') {
        try {
          const call = wsHandlerRegistry.lookup(i.n);
          if (call) {
            const r = await call(ctxWs, i.a);
            ctxWs.ws.send(JSON.stringify({
              id: i.id,
              s: '+',
              r,
            }));
          } else {
            ctxWs.ws.send(JSON.stringify({
              id: i.id,
              s: '-NF',
            }));
          }
        } catch (e) {
          ctxWs.ws.send(JSON.stringify({
            id: i.id,
            s: '-EX',
            e,
          }));
        }
      } else if (i.id && (ss === '+' || ss === '-')) {
        const req = ctxWs.requests.remove(i.id);
        if (req) {
          if (ss === '+') {
            req.resolve(i.r);
          } else {
            req.reject(i.e);
          }
        }
      } else {
        ctxWs.ws.terminate();
      }
    } catch {
      ctxWs.ws.terminate();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  function noop() {

  }

  function ping() {
    console.log('sending pings');
    wss.clients.forEach(function each(ws: webSocketExtendedType) {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping(noop);
    });
  }

  setInterval(ping, 30000);

  async function onClose(ctxWs: ctxWsType) {
    await wsOnCloseHandler(ctxWs);
    for (const id of ctxWs.requests.names) {
      if (ctxWs.requests.lookup(id)?.ctxWs === ctxWs) {
        const p = ctxWs.requests.remove(id);
        p?.reject({id: p.id, s: '-CC'});
      }
    }
    ctxWsRegistry.remove(ctxWs.sessionId);
  }

  wss.on('connection', async (ctxWs: ctxWsType) => {
    if (ctxWs.ws.protocol !== 'rpc_v1') {
      ctxWs.ws.send({supportedProtocols: ['rpc_v1']});
      ctxWs.ws.terminate();
      return;
    }
    ctxWs.ws.isAlive = true;
    ctxWs.ws.on('close', () => onClose(ctxWs));
    ctxWs.ws.on('pong', heartbeat);
    await wsOnConnectHandler(ctxWs);
    ctxWs.ws.on('message', data => fromRemote(ctxWs, data as string));
  });

  const ctxWsRegistry = registryCtor<ctxWsType>();

  function call(ctxWs: ctxWsType, callName: string, params: serializableType): Promise<serializableType> {
    return new Promise<serializableType>((resolve, reject) => {
      const id = tuidCtor();
      const data = JSON.stringify({id, n: callName, a: params, s: '?'});
      ctxWs.requests.register(id, {
        ctxWs,
        id,
        resolve,
        reject,
        data,
        sent: false,
      });
      if (isActive(ctxWs.ws)) {
        processPending();
      }
    });
  }

  wss.on('headers',function (headers: string[], req: IncomingMessage) {
    console.log('WS headers', headers);
    const hostHdr = req.headers.host;
    const m = hostHdr?.match(/([^.]+\.)*(?<tld>[^.:]+\.[^.:]+)(:\d+)?$/)
    const host = m?.groups?.tld;

    console.log('WS Session Host:', host);

    if (host) {
      const sessionId = (req as any)._.sessionId;
      // SameSite=Lax is required for the redirect from GoogleAuth back to our server to send cookies in Chrome.
      const header = `Set-Cookie: SessionId=${sessionId}; HttpOnly; Path=/; SameSite=None; Domain=${host}; Max-Age=3600${settings.schema === 'https' ? '; Secure' : ''}`;
      headers.push(header);
      console.log('WS headers', headers);
    }
  });

  server.on('upgrade', async function upgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    console.log('WS upgrade');
    const ctx = ctxReqCtor(req, dbProvider);
    const pathname = ctx.url.path;
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    await sessionInit(ctx);
    (req as any)._ ||= {};
    (req as any)._.sessionId = ctx.sessionId;


    wss.handleUpgrade(req, socket, head, function done(ws) {
      const wsX: webSocketExtendedType = ws as webSocketExtendedType;
      wsX.isAlive = true;

      const ctxWs: ctxWsType = {
        ws: wsX,
        sessionId: ctx.sessionId,
        session: ctx.session,
        user: ctx.user,
        db: ctx.db,
        dbProvider: ctx.dbProvider,
        permission: ctx.permission,
        requests: registryCtor<requestType>(),
        call(name: string, params: serializableType): Promise<serializableType> {
          return call(ctxWs, name, params);
        },
      };

      ctxWsRegistry.register(ctxWs.sessionId, ctxWs);

      wss.emit('connection', ctxWs);
    });
  });

  function isActive(ws: WebSocket | undefined): boolean {
    return ws?.readyState === WebSocket.OPEN;
  }

  function processPending(): void {
    ctxWsRegistry.values.forEach(ctx => {
      const ids = ctx.requests.names;
      for (const id of ids) {
        const r = ctx.requests.lookup(id);
        if (r && isActive(r.ctxWs?.ws) && !r.sent) {
          r.ctxWs.ws?.send(r.data);
          r.sent = true;
        }
      }
    });
  }

  return {wss, call};
}
