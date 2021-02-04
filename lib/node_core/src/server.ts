// istanbul ignore file
// -- bootstrap

import {createServer, IncomingMessage, Server, ServerResponse} from 'http';
import {contentHandlerType, ctxType, wsHandlerType, serverSettingsType, ctxWsType} from './server.type';
import {ctxCtor} from './ctx';
import {gauthContinueCtor, gauthInitCtor} from './gauth';
import {userSetCtor, userVivifyCtor} from './user';
import {sessionInfoCtor, sessionInitCtor, sessionSetCtor} from './session';
import {secureTokenCtor, secureTokenVerify} from './stoken';
import axios from 'axios';
import {wsInit, wsType} from './ws';
import {readonlyRegistryType} from 'ts_agnostic/src/registry';
import {serializableType} from 'ts_agnostic/src/serialize';

//----------------------

export function server(
  settings: serverSettingsType,
  contentHandlerArray: contentHandlerType[],
  wsHandlerRegistry: readonlyRegistryType<wsHandlerType>,
  wsOnConnectHandler: (ctxWs: ctxWsType) => Promise<serializableType>,
  wsOnCloseHandler: (ctxWs: ctxWsType) => Promise<serializableType>,
): { server: Server, ws: wsType } {
  function handleNotFound(res: ServerResponse) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('404 No route found');
  }

  async function handleContent(ctx: ctxType) {
    for (const handler of contentHandlerArray) {
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
  contentHandlerArray.unshift(sessionInfo);

  const userVivify = userVivifyCtor();
  const userSet = userSetCtor(settings);
  let gauthInit: (ctx: ctxType) => Promise<void>;
  let gauthContinue: (ctx: ctxType) => Promise<void>;

  if (settings.google) {
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
      userVivify,
      axios.post,
    );
  }

  async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const ctx = ctxCtor(req, res);

      // every request gets a sessionId
      await sessionInit(ctx);


      if (settings.google) {
        // check for auth
        await gauthInit(ctx);
        if (ctx.res.writableEnded) {
          return;
        }

        await gauthContinue(ctx);
        if (res.writableEnded) {
          return;
        }
      }

      // set session cookie in response header
      await sessionSet(ctx);

      // set user data in ctx from session
      await userSet(ctx);

      // handle first content request
      await handleContent(ctx);

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

  switch (settings.bind.kind) {
    case 'default':
      server.listen(80, '0.0.0.0');
      break;
    case 'ip':
      server.listen(+settings.bind.port, settings.bind.ip);
      break;
    case 'unix':
      server.listen( 'socket');
      break;
    default:
      throw new Error(`Invalid bind: ${JSON.stringify(settings.bind)}`);
  }

  const ws = wsInit(
    wsHandlerRegistry,
    wsOnConnectHandler,
    wsOnCloseHandler,
    server,
    settings,
    sessionInit,
    userSet,
  );

  return {server, ws};
}
