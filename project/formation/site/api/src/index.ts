// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {ctxBaseType, exitPromise, gauthUserInfoType, server} from 'node_core';
import {wsHandlerRegistry, wsOnCloseHandler, wsOnConnectHandler} from './ws';
import {contentHandlerArray} from './content_handler';

async function onUserData(ctx: ctxBaseType, gauthUserInfo: gauthUserInfoType, rawAuthResponse: string): Promise<void> {
  return undefined;
}

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
