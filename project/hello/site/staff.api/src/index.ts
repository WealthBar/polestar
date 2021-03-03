// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {ctxBaseType, exitPromise, gauthUserInfoType, normalizeEmail, server} from 'node_core';
import {wsHandlerRegistry, wsOnCloseHandler, wsOnConnectHandler} from './ws';
import {value as vivifyLoginSql} from './vivify_login_sql';

async function onUserData(ctx: Pick<ctxBaseType, 'dbProvider' | 'user'>, gauthUserInfo: gauthUserInfoType, rawAuthResponse: string): Promise<void> {
  if (!gauthUserInfo.email_verified) {
    return undefined;
  }
  const locale = gauthUserInfo.locale?.toLowerCase()?.startsWith('fr') ? 'fr' : 'en';
  const r = await ctx.dbProvider(
    '-',
    db => {
      return db.oneOrNone<{ login?: string }>(
        vivifyLoginSql,
        {
          login: normalizeEmail(gauthUserInfo.email),
          email: gauthUserInfo.email,
          locale,
        });
    });

  ctx.user = r?.login ? {login: r.login} : undefined;
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
