import {serializableType} from 'lib_agnostic/src/serialize';
import {readonlyRegistryType, registryCtor, registryType} from 'lib_agnostic/src/registry';
import {DateTime, Duration} from 'luxon';
import {tuidCtor} from 'lib_agnostic/src/tuid';

export type wsHandlerType = (params: serializableType) => Promise<serializableType>;

export type wsType = {
  call(callName: string, params: serializableType): Promise<serializableType>;
  isActive(): boolean;
};

type requestType = {
  id: string,
  resolve: (r: serializableType) => void,
  reject: (r: serializableType) => void,
  data: string,
};

export function wsCtor(
  callRegistry: readonlyRegistryType<wsHandlerType>,
  onConnectHandler: () => void,
  onCloseHandler: () => void,
): wsType {

  const schema = window.location.protocol === 'http:' ? 'ws:' : 'wss:';
  const wsUrl = `${schema}//${window.location.host}/ws`;
  let ws: WebSocket | undefined;

  let lastConnectionAttemptAt = DateTime.utc().minus({minutes: 2});
  let waiting = false;

  const pending: registryType<requestType> = registryCtor<requestType>();
  const sent: registryType<requestType> = registryCtor<requestType>();

  function isActive(): boolean {
    return ws?.readyState === WebSocket.OPEN;
  }

  function processPending(): void {
    if (isActive()) {
      pending.values.forEach(p => {
        ws?.send(p.data);
        sent.register(p.id, p);
      });
      pending.clear();
    }
  }

  async function processMessage(data: string): Promise<void> {
    const i: { id?: string; n?: string; a?: serializableType, s?: string, e?: serializableType, r?: serializableType } = JSON.parse(data);
    const ss = i.s?.[0];
    if (i.id && i.n && ss === '?') {
      try {
        const call = callRegistry.lookup(i.n);
        if (call) {
          const r = await call(i.a);
          ws?.send(JSON.stringify({
            id: i.id,
            s: '+',
            r,
          }));
        } else {
          ws?.send(JSON.stringify({
            id: i.id,
            s: '-NF',
          }));
        }
      } catch (e) {
        ws?.send(JSON.stringify({
          id: i.id,
          s: '-EX',
          e,
        }));
      }
    } else if (i.id && (ss === '-' || ss === '+')) {
      const req = sent.remove(i.id);
      if (req) {
        if (ss === '+') {
          req.resolve(i.r);
        } else {
          req.reject(i.e);
        }
      }
    }
  }

  function reconnect(): void {
    if (waiting) {
      return;
    }
    const utc = DateTime.utc();
    const timeSinceLastConnectionAttemptAt = utc.diff(lastConnectionAttemptAt);
    if (timeSinceLastConnectionAttemptAt < Duration.fromObject({seconds: 30})) {
      const delay = timeSinceLastConnectionAttemptAt.as('milliseconds');
      waiting = true;
      setTimeout(() => {
        waiting = false;
        reconnect();
      }, delay);
      return;
    }

    lastConnectionAttemptAt = utc;

    ws = new WebSocket(wsUrl, ['rpc_v1']);

    ws.onopen = () => {
      onConnectHandler();
      processPending();
    };

    ws.onmessage = async (ev: MessageEvent) => {
      await processMessage(ev.data as string);
    };

    ws.onclose = () => {
      ws = undefined;
      onCloseHandler();
      reconnect();
    };

    ws.onerror = (ev: Event) => {
      console.error(ev);
      ws?.close();
    };
  }

  reconnect();

  async function call(callName: string, params: serializableType): Promise<serializableType> {
    return new Promise<serializableType>((resolve, reject) => {
      const id = tuidCtor();
      const data = JSON.stringify({id, n: callName, a: params, s: '?'});
      pending.register(id, {
        id,
        resolve,
        reject,
        data,
      });
      if (isActive()) {
        processPending();
      }
    });
  }

  return {call, isActive};
}
