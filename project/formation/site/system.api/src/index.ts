// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {exitPromise, server} from 'node_core';
import {wsHandlerRegistry, wsOnCloseHandler, wsOnConnectHandler} from './ws';
import {resolvedVoid} from 'ts_agnostic';


function onUserData(ctx: never, gauthUserInfo: never, rawAuthResponse: never): Promise<void> {
  return resolvedVoid;
}

const contentHandlerArray = [
];

main(async () => {
  await server(
    settings,
    contentHandlerArray,
    wsHandlerRegistry,
    wsOnConnectHandler,
    wsOnCloseHandler,
    onUserData,
  );

  await exitPromise;
});
