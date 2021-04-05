// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {exitPromise, server} from 'node_core';
import {wsHandlerRegistry, wsOnCloseHandler, wsOnConnectHandler} from './ws';
import {resolvedVoid} from 'ts_agnostic';
import {v1AuthHandler} from './content_handler/v1_auth';
import {v1InitHandler} from './content_handler/v1_init';
import {v1DocHandler} from './content_handler/v1_doc';
import {v1ResultHandler} from './content_handler/v1_result';

function onUserData(ctx: never, gauthUserInfo: never, rawAuthResponse: never): Promise<void> {
  return resolvedVoid;
}

const contentHandlerArray = [
  v1AuthHandler, // must be first! order matters!
  v1InitHandler,
  v1ResultHandler,
  v1DocHandler,
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
