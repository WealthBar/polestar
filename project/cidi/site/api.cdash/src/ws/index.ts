// istanbul ignore file
import {ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor, resolvedUndefined, serializableType} from 'ts_agnostic';
import {wsEcho} from './echo';

export const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
]);

export async function wsOnConnectHandler({
  remoteAddress,
  sessionId
}: Pick<ctxWsType, 'remoteAddress' | 'sessionId'>): Promise<serializableType> {
  console.log(`wsOnConnect: ${remoteAddress || 'addr?'} [${sessionId}]`);
  return resolvedUndefined;
}

export async function wsOnCloseHandler({
  remoteAddress,
  sessionId
}: Pick<ctxWsType, 'remoteAddress' | 'sessionId'>): Promise<serializableType> {
  console.log(`wsOnConnect: ${remoteAddress || 'addr?'} [${sessionId}]`);
  return resolvedUndefined;
}
