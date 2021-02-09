// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {server} from 'node_core';
import {contentHandlerType, ctxWsType, wsHandlerType} from 'node_core';
import {readonlyRegistryCtor} from 'ts_agnostic';
import {serializableType} from 'ts_agnostic';
import {resolvedUndefined} from 'ts_agnostic';
import {exitPromise} from 'node_core';

async function wsEcho(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('server:ws:recv_echo', ctxWs.user?.name, params);
  console.log('server:ws:call_echo', await ctxWs.call('echo', 'back at ya!'));
  return params;
}

async function wsEmailInUse(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('wsEmailInUse', params);
  return {is_use: params?.['email'] === 'bob@example.com'} ;
}

const requestHandlers: contentHandlerType[] = [];

const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['emailInUse', wsEmailInUse],
]);

async function wsOnConnectHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnConnect: ${ctxWs.user?.email || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

async function wsOnCloseHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnClose: ${ctxWs.user?.email || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

main(async () => {
  await server(
    settings,
    requestHandlers,
    wsHandlerRegistry,
    wsOnConnectHandler,
    wsOnCloseHandler,
  );

  await exitPromise;
});
