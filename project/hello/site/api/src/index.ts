// istanbul ignore file
// -- bootstrap

import {main} from 'lib_script/src/main';
import {settings} from './settings';
import {server} from 'lib_backend/src/server';
import {contentHandlerType, ctxWsType, wsHandlerType} from 'lib_backend/src/server.type';
import {readonlyRegistryCtor} from 'lib_agnostic/src/registry';
import {serializableType} from 'lib_agnostic/src/serialize';
import {resolvedUndefined} from 'lib_agnostic/src/resolved';
import {exitPromise} from 'lib_backend/src/exit';

async function wsEcho(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('server:ws:recv_echo', ctxWs.user?.name, params);
  console.log('server:ws:call_echo', await ctxWs.call('echo', 'back at ya!'));
  return params;
}

const requestHandlers: contentHandlerType[] = [];

const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
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
