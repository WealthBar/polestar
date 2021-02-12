// istanbul ignore file
// -- bootstrap

import {createServer, IncomingMessage, Server, ServerResponse} from 'http';
import {contentHandlerType, ctxType, wsHandlerType, serverSettingsType, ctxWsType} from './server.type';
import {ctxCtor} from './ctx';
import {gauthContinueCtor, gauthInitCtor, gauthOnUserData} from './gauth';
import {sessionInfoCtor, sessionInitCtor, sessionSetCtor} from './session';
import {secureTokenCtor, secureTokenVerify} from './stoken';
import axios from 'axios';
import {wsInit, wsType} from './ws';
import {readonlyRegistryType} from 'ts_agnostic';
import {serializableType} from 'ts_agnostic';
import {dbProviderCtor, sessionExpire} from './db';

//----------------------

export function server(
  settings: serverSettingsType,
  handlerArray: contentHandlerType[],
  wsHandlerRegistry: readonlyRegistryType<wsHandlerType>,
  wsOnConnectHandler: (ctxWs: ctxWsType) => Promise<serializableType>,
  wsOnCloseHandler: (ctxWs: ctxWsType) => Promise<serializableType>,
  onUserData?: gauthOnUserData,
): { server: Server, ws: wsType } {
  function handleNotFound(res: ServerResponse) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('404 No route found');
  }

  let ha: contentHandlerType[] = [];

  async function runHandlerArray(ctx: ctxType) {
    for (const handler of ha) {
      await handler(ctx);
      if (ctx.res.writableEnded) {
        return;
      }
    }
  }

  function handleServerError(res: ServerResponse, e: Error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`500 Server Error:\n${e}`);
  }

  const sessionInit = sessionInitCtor(settings);
  const sessionSet = sessionSetCtor(settings);
  const sessionInfo = sessionInfoCtor(settings);

  let gauthInit: (ctx: ctxType) => Promise<void>;
  let gauthContinue: (ctx: ctxType) => Promise<void>;

  if (settings.google && onUserData) {
    gauthInit = gauthInitCtor({
        sessionSecret: settings.sessionSecret,
        google: settings.google,
      },
      secureTokenCtor,
    );

    gauthContinue = gauthContinueCtor({
        sessionSecret: settings.sessionSecret,
        appUrl: '/app',
        google: settings.google,
      },
      secureTokenVerify,
      onUserData,
      axios.post,
    );
    ha = [sessionInit, sessionSet, gauthInit, gauthContinue, sessionInfo, ...handlerArray];
  } else {
    ha = [sessionInit, sessionSet, sessionInfo, ...handlerArray];
  }

  const dbProvider = dbProviderCtor(settings.dbConnectionString);

  async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const ctx = ctxCtor(req, res, dbProvider);

      await runHandlerArray(ctx);

      if (!res.writableEnded) {
        handleNotFound(res);
      }
    } catch (e) {
      console.error(e);
      if (!res.writableEnded) {
        handleServerError(res, e);
      }
    }
  }

  const server: Server = createServer(requestHandler);

  setInterval(async () => {
    console.log('expiring sessions');
    try {
      // noinspection JSIgnoredPromiseFromCall
      await sessionExpire(dbProvider);

    } catch (e) {
      console.log(e);
    }
  }, 60000);

  server.listen(+settings.port, settings.host);

  const ws = wsInit(wsHandlerRegistry, wsOnConnectHandler, wsOnCloseHandler, server, settings, sessionInit, dbProvider);

  return {server, ws};
}
