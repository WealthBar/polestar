// istanbul ignore file
// -- bootstrap

import {main} from 'node_script';
import {settings} from './settings';
import {
  gauthUserInfoType,
  server,
  exitPromise,
  contentHandlerType,
  ctxWsType,
  wsHandlerType,
  sessionUpdate,
} from 'node_core';
import {readonlyRegistryCtor, serializableType, resolvedUndefined} from 'ts_agnostic';
import {value as loginStatusSql} from './login_status_sql';

async function wsEcho(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('server:ws:recv_echo', ctxWs?.user?.login, params);
  console.log('server:ws:call_echo', await ctxWs.call('echo', 'back at ya!'));
  return params;
}

async function wsEmailStatus(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('wsEmailStatus', params);
  const p = params as { email: string };
  if (!p) {
    return {inUse: false, allowGoogleLogin: false};
  }
  const {email} = p;

  return ctxWs.db(async (db) => {
    const r = await db.oneOrNone<{ in_use: boolean, allow_google_login: boolean }>(loginStatusSql, {email});
    if (!r) {
      return {inUse: false, allowGoogleLogin: false};
    }
    return {inUse: r.in_use, allowGoogleLogin: r.allow_google_login};
  });
}

async function wsEmailSendVerification(ctxWs: ctxWsType, params: serializableType): Promise<serializableType> {
  console.log('wsEmailStatus', params);
  const p = params as { email: string };
  if (!p) {
    return {error: 'NO_EMAIL'};
  }
  const {email} = p;
  const code = [1, 2, 3, 4, 5, 6, 7, 8].map(_ => Math.trunc(Math.random() * 10).toString()).join('');
  ctxWs.session.emailVerification = {email, code};
  await sessionUpdate(ctxWs);
  console.log('evc', email, code);
}

const requestHandlers: contentHandlerType[] = [];

const wsHandlerRegistry = readonlyRegistryCtor<wsHandlerType>([
  ['echo', wsEcho],
  ['emailStatus', wsEmailStatus],
  ['emailSendVerification', wsEmailSendVerification],
]);

async function wsOnConnectHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnConnect: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

async function wsOnCloseHandler(ctxWs: ctxWsType): Promise<serializableType> {
  console.log(`wsOnClose: ${ctxWs?.user?.login || ctxWs.sessionId || 'wtf?'}`);
  return resolvedUndefined;
}

async function onUserData(gauthUserInfo: gauthUserInfoType, rawAuthResponse: string): Promise<string | undefined> {
  return undefined;
}

main(async () => {
  await server(
    settings,
    requestHandlers,
    wsHandlerRegistry,
    wsOnConnectHandler,
    wsOnCloseHandler,
    onUserData,
  );

  await exitPromise;
});
