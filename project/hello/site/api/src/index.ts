// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {exitPromise, gauthUserInfoType, server} from 'node_core';
import {wsHandlerRegistry, wsOnCloseHandler, wsOnConnectHandler} from './ws';
import {contentHandlerArray} from './content_handler';

async function onUserData(gauthUserInfo: gauthUserInfoType, rawAuthResponse: string): Promise<string | undefined> {
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
