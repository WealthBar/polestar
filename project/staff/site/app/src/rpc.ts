import {rpcCtor} from './ws_rpc_client/ws_rpc_client';
import {packetCallRequestType} from '../../api/src/agnostic/remote_request_manager';
import {serializableType} from '../../api/src/agnostic/serialize';
import {registryCtor} from '@/agnostic/registry';
import {callHandler} from '@/rpc.type';
import {logCallHandler} from '@/app/log';

const registry = registryCtor<callHandler>();
registry.register("log", logCallHandler);

//--------------------

export const rpc = rpcCtor(async (packet: packetCallRequestType): Promise<serializableType | undefined> => {
  const name = packet.call?.name;
  if (name) {
    const handler = registry.lookup(name);
    if (!handler) {
      throw "NOT_FOUND";
    }
    return handler(packet.call.params);
  }
  throw "INVALID_CALL";
});

export const vRpc = {
  install(vue: any, options: any) {
    vue.mixin({
      computed: {
        $rpc() {
          return rpc;
        },
      },
    });
  },
};
