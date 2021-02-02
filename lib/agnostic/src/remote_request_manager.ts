import {tuidCtorType} from './tuid';
import {cancellationTokenType} from './cancellation_token';
import {DateTime, Duration} from 'luxon';
import {registryCtor} from './registry';
import {serializableType} from './serialize';

export type packetCtlType = { id: string, ctl: string };
export type packetCallRequestType = { id: string, call: { name: string, params: serializableType } };
export type packetCallResponseRetType = { id: string, ret?: serializableType };
export type callErrType = { code: string, details?: serializableType };
export type packetCallResponseErrType = { id: string, err: callErrType };
export type packetType =
  packetCtlType
  | packetCallRequestType
  | packetCallResponseRetType
  | packetCallResponseErrType;

type pendingRequestType = {
  id: string,
  resolve: (r?: serializableType) => void,
  reject: (r: callErrType) => void,
  callName: string,
  params: serializableType,
  cancellationToken?: cancellationTokenType,
  unregisterCancellationCallback?: () => void,
  when: DateTime,
  sent: boolean,
};

export type remoteRequestManagerType = {
  call(callName: string, params?: serializableType, callCancellationToken?: cancellationTokenType): Promise<serializableType | undefined>;
  fromRemote(data: string): Promise<void>;
  ping(): void,
  init(): void,
  lag: Duration,
  pending: number,
};

export type remoteRequestManagerCtorType = (
  toRemote: (data: string) => void,
  handleCallRequest: (call: packetCallRequestType) => Promise<serializableType | undefined>,
  onPing: () => void,
  onError: (error: string, details: Record<string, unknown>) => void,
) => remoteRequestManagerType;


// istanbul ignore next
// provided for ease of use by the consumer of remoteRequestManagerCtorCtor
export function utcTime(): DateTime {
  return DateTime.utc();
}

export function remoteRequestManagerCtorCtor(
  tuidCtor: tuidCtorType,
  getTime: () => DateTime,
): remoteRequestManagerCtorType {
  function remoteRequestManagerCtor(
    toRemote: (data: string) => void,
    handleCallRequest: (call: packetCallRequestType) => Promise<serializableType | undefined>,
    onPing: () => void,
    onError: (error: string, details: Record<string, unknown>) => void,
  ): remoteRequestManagerType {
    const _pendingRequests = registryCtor<pendingRequestType>();
    let _isActive = false;
    let _lastPing = getTime();
    let _lag = Duration.fromMillis(0);

    function handleCallResponseErr(err: packetCallResponseErrType): void {
      const pendingRequest = _pendingRequests.remove(err.id);
      if (pendingRequest) {
        pendingRequest.unregisterCancellationCallback?.();
        pendingRequest.reject(err.err);
      }
    }

    function handleCallResponseRet(ret: packetCallResponseRetType): void {
      const pendingRequest = _pendingRequests.remove(ret.id);
      if (pendingRequest) {
        if (pendingRequest.unregisterCancellationCallback) {
          pendingRequest.unregisterCancellationCallback();
        }
        pendingRequest.resolve(ret.ret);
      }
    }

    function processPending() {
      _pendingRequests.values.forEach(req => {
        if (req.sent) {
          return;
        }

        const request: packetCallRequestType = {
          id: req.id,
          call: {
            name: req.callName,
            params: req.params,
          },
        };
        toRemote(JSON.stringify(request));
        req.sent = true;
      });
    }

    function handleCtl(ctl: packetCtlType): void {
      switch (ctl.ctl) {
        case 'init' : {
          _isActive = true;
          toRemote('{"ctl":"active"}');
          processPending();
          break;
        }
        case 'ping': {
          toRemote('{"ctl":"pong"}');
          onPing();
          break;
        }
        case 'pong': {
          const now = getTime();
          _lag = Duration.fromMillis(now.diff(_lastPing).as('milliseconds') / 2);
          _lastPing = now;
          break;
        }
        default:
      }
    }

    function ping(): void {
      // used to keep the connection alive and compute lag
      toRemote('{"ctl":"ping"}');
      _lastPing = getTime();
    }

    function init(): void {
      // used to indicate to the remote that this side is ready for requests.
      toRemote('{"ctl":"init"}');
      _lastPing = getTime();
    }

    async function call(callName: string, params?: serializableType, callCancellationToken?: cancellationTokenType): Promise<serializableType | undefined> {
      return new Promise<serializableType | undefined>((resolve, reject) => {
        const id = tuidCtor();
        _pendingRequests.register(id, {
          id,
          resolve,
          reject,
          callName,
          params: params || {},
          cancellationToken: callCancellationToken,
          unregisterCancellationCallback: callCancellationToken?.onCancelRequested(() => {
            handleCallResponseErr({id, err: {code: 'CALL_CANCELLED'}});
          }),
          when: getTime(),
          sent: false,
        });
        if (_isActive) {
          processPending();
        }
      });
    }

    async function fromRemote(data: string): Promise<void> {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const packet: any = JSON.parse(data);
        if (packet.ctl) {
          handleCtl(packet);
        } else if (packet.call) {
          try {
            const result = await handleCallRequest(packet);
            const resultPacket: packetCallResponseRetType = {id: packet.id, ret: result};
            toRemote(JSON.stringify(resultPacket));
          } catch (exception) {
            toRemote(JSON.stringify({id: packet.id, err: {code: 'CALL_EXCEPTION', exception}}));
          }
        } else if (packet.err) {
          handleCallResponseErr(packet);
        } else if (packet.id) {
          handleCallResponseRet(packet);
        } else {
          onError('invalid message data', {data});
        }
      } catch (exception) {
        onError('exception', exception);
      }
    }

    return {
      call,
      fromRemote,
      get lag(): Duration {
        return _lag;
      },
      ping,
      init,
      get pending(): number {
        return _pendingRequests.names.length;
      },
    };
  }

  return remoteRequestManagerCtor;
}

export type remoteRequestManagerCtorCtorType = typeof remoteRequestManagerCtorCtor;
