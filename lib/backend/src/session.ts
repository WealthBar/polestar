// istanbul ignore file
// -- will be replaced with DB based session storage

import {ctxType, contentHandlerType, sessionStoreType, sessionType, ctxReqType, reqHandlerType} from './server.type';
import {resolvedVoid} from 'lib_agnostic/src/resolved';
import {stuidCtor} from './stuid';
import {vivify} from 'lib_agnostic/src/vivify';

const sessionStore: sessionStoreType = {};

export type sessionInitCtorType = (settings: Record<string,unknown>) => reqHandlerType;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function sessionInitCtor(settings: Record<string,unknown>): reqHandlerType {
  function sessionInit(ctx: ctxReqType): Promise<void> {
    const sessionIdFromCookie = ctx.cookie.find(e => e[0] === 'SessionId');
    if (sessionIdFromCookie) {
      ctx.sessionId = sessionIdFromCookie[1];
    }

    ctx.sessionId ||= stuidCtor();
    ctx.session = vivify(sessionStore, ctx.sessionId, {} as sessionType);

    return resolvedVoid;
  }

  return sessionInit;
}

export type sessionSetCtorType = (settings: {
  schema: string;
  host: string;
}) => contentHandlerType;

export function sessionSetCtor(
  settings: {
    schema: string;
  } & Record<string,unknown>
  ): contentHandlerType {
  function sessionSet(ctx: ctxType): Promise<void> {
    // TODO: lift the top-level-domain extraction into the ctx setup so other handlers can use it too.
    const hostHdr = ctx.req.headers.host;
    const m = hostHdr?.match(/([^.]+\.)*(?<tld>[^.:]+\.[^.:]+)(:\d+)?$/)
    const host = m?.groups?.tld;

    console.log('Session Host:', host);

    if (host) {
      // SameSite=Lax is required for the redirect from GoogleAuth back to our server to send cookies in Chrome.
      ctx.res.setHeader('Set-Cookie', `SessionId=${ctx.sessionId}; HttpOnly; Path=/; SameSite=Lax; Domain=${host}; Max-Age=3600${settings.schema === 'https' ? '; Secure' : ''}`);
    }
    return resolvedVoid;
  }
  return sessionSet;
}

export function sessionInfoCtor(settings: Record<string,unknown>): contentHandlerType {
  function sessionInfo(ctx: ctxType): Promise<void> {
    if (ctx.url.path !== '/session') {
      return resolvedVoid;
    }
    const { res } = ctx;
    res.setHeader('content-type','application/json');
    res.statusCode = 200;
    res.write(JSON.stringify(ctx.session));
    res.end();
    return resolvedVoid;
  }
  return sessionInfo;
}
