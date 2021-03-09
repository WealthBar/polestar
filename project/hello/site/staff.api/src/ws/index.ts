import {ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor, resolvedUndefined, serializableType} from 'ts_agnostic';
import {wsEcho} from './echo';
import {wsStaffWhoAmI} from './staff/who_am_i';

export const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['staff/whoAmI', wsStaffWhoAmI],
]);

export async function wsOnConnectHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnConnect: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

export async function wsOnCloseHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnClose: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}
