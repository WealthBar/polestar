import {ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor, resolvedUndefined, serializableType} from 'ts_agnostic';
import {wsEcho} from './echo';
import {wsFlowV1Test} from './wo/v1/test';
import {wsWfV1FlowInfo} from "./wf/v1/flow_info";

export const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['wo/v1/test', wsFlowV1Test],
  ['wf/v1/flowInfo', wsWfV1FlowInfo],
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
