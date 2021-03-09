// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {ctxBaseType, exitPromise, gauthUserInfoType, normalizeEmail, server} from 'node_core';
import {wsHandlerRegistry, wsOnCloseHandler, wsOnConnectHandler} from './ws';
import {value as vivifyLoginSql} from './vivify_login_sql';

async function onUserData(ctx: Pick<ctxBaseType, 'dbProvider' | 'user' | 'remoteAddress'>, gauthUserInfo: gauthUserInfoType, rawAuthResponse: string): Promise<void> {
  if (!gauthUserInfo.email_verified) {
    return undefined;
  }
  const locale = gauthUserInfo.locale?.toLowerCase()?.startsWith('fr') ? 'fr' : 'en';
  const login = normalizeEmail(gauthUserInfo.email);

  // since by default a new login has no permissions it's fine to create the login for anyone.
  await ctx.dbProvider(
    '-',
    db => {
      return db.oneOrNone(
        vivifyLoginSql,
        {
          login: login,
          email: gauthUserInfo.email,
          locale,
          remoteAddress: ctx.remoteAddress,
          rawAuthResponse,
        });
    });
  ctx.user = {login};
}

const contentHandlerArray = [];

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
