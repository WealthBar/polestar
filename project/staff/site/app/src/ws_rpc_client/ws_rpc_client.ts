import {packetCallRequestType, remoteRequestManagerCtor} from '../agnostic/remote_request_manager';
import {serializableType} from '../agnostic/serialize';
import {DateTime, Duration} from 'luxon';
import milliseconds from 'mocha/lib/ms';

export const _ = {window, WebSocket};

export type rpcType = {
  call(callName: string, params?: serializableType): Promise<serializableType | undefined>,
};

export function rpcCtor(handleCallRequest: (call: packetCallRequestType) => Promise<serializableType | undefined>): rpcType {
  const schema = _.window.location.protocol === 'http:' ? 'ws:' : 'wss:';
  const wsUrl = `${schema}//${_.window.location.host}/api/rpc`;
  let ws: WebSocket | undefined;

  let lastConnectionAttemptAt = DateTime.utc().minus({minutes: 2});
  let waiting = false;

  function reconnect() {
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

    lastConnectionAttemptAt =  utc;

    ws = new _.WebSocket(wsUrl, ['rpc_v1']);

    ws.onopen = (ev: Event) => {
      console.log(ev);
      if (ws) {
        pending.forEach(msg => ws?.send(msg));
        pending.length = 0;
      }
    };

    ws.onmessage = async (ev: MessageEvent) => {
      console.log(ev);
      return remoteRequestManager.fromRemote(ev.data);
    };

    ws.onclose = (ev: CloseEvent) => {
      console.log(ev);
      ws = undefined;
      reconnect();
    };

    ws.onerror = (ev: Event) => {
      console.log(ev);
      if (ws) {
        ws.close();
      }
    };
  }

  reconnect();

  const pending: string[] = [];

  function toRemote(msg: string) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else {
      pending.push(msg);
    }
  }

  const remoteRequestManager = remoteRequestManagerCtor(
    toRemote,
    handleCallRequest,
    () => {
    },
  );

  setInterval(ping, 30000);

  remoteRequestManager.init();

  function ping() {
    if (ws?.readyState === WebSocket.OPEN) {
      remoteRequestManager.ping();
    }
  }

  return {
    call: remoteRequestManager.call,
  };
}
