import {ctxWsType} from 'node_core';
import {serializableType} from 'ts_agnostic';

export async function wsEcho(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('server:ws:recv_echo', ctxWs?.user?.login, params);
  console.log('server:ws:call_echo', await ctxWs.call('echo', 'back at ya!'));
  return params;
}
