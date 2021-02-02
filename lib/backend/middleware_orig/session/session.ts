/* eslint-disable @typescript-eslint/no-explicit-any */
import {dbSessionType, sessionInfoType} from '../../db/db_session';
import debugCtor = require('debug');
import {ctxRequestIdType} from '../request_id/request_id';
import {ctxType} from '../../ctx.type';
import {parseBoolean} from 'libs_agnostic/src/parse_boolean';

const debug = debugCtor('middleware:session');

const ONE_HOUR = 60 * 60 * 1000;

export type ctxSessionType = { sessionInfo: sessionInfoType, userId?: string, session?: any };

export type ctxSessionMiddlewareType = ctxType & ctxSessionType & ctxRequestIdType;
export type sessionSettingsType = {
  sessionCookieSecure?: boolean;
  sessionCookieName?: string;
  sessionCookieMaxAge?: number;
};

export type sessionType = (ctx: ctxSessionMiddlewareType, next: () => Promise<void>) => Promise<void>;

export function sessionCtor(dbSession: dbSessionType, settings: sessionSettingsType) : sessionType {
  let sessionCookieMaxAge = ONE_HOUR;
  let sessionCookieName = '_sessionId';
  let sessionCookieSecure = false;

  async function init(ctx: ctxSessionMiddlewareType) {
    const sessionId = ctx.cookies.get(sessionCookieName);
    debug(`init sessionId: ${JSON.stringify(sessionId)}`);

    if (sessionId) {
      ctx.sessionInfo = await dbSession.verify(sessionId, ctx.requestId)||{data:{}};
    }

    if (!ctx.sessionInfo) {
      ctx.sessionInfo = await dbSession.create(ctx.requestId)||{data:{}};
    }

    ctx.session = ctx?.sessionInfo?.data;

    debug(`sessionInfo: ${JSON.stringify(ctx.sessionInfo)}`);
  }

  async function clearCookie(ctx: ctxSessionMiddlewareType) {
    ctx.cookies.set(sessionCookieName);
  }

  async function setCookie(ctx: ctxSessionMiddlewareType) {
    try {
      debug(`setCookie ${JSON.stringify({
        sessionInfo: ctx.sessionInfo,
        sessionCookieMaxAge,
        sessionCookieSecure,
      })}`);
      if (ctx.sessionInfo.sessionId) {
        ctx.cookies.set(
          sessionCookieName,
          ctx.sessionInfo.sessionId,
          {
            maxAge: sessionCookieMaxAge,
            httpOnly: true,
            secure: sessionCookieSecure,
          });
      }
    } catch (e) {
      debug('Could not set Cookie (in a websocket?)');
    }
  }

  async function commit(ctx: ctxSessionMiddlewareType) {
    debug(`commit ${JSON.stringify({sessionInfo: ctx.sessionInfo, sessionCookieMaxAge})}`);
    await dbSession.update(ctx.sessionInfo, sessionCookieMaxAge, ctx.requestId);
  }

  async function middleware(ctx: ctxSessionMiddlewareType, next: () => Promise<void>) {
    if (settings.sessionCookieMaxAge) {
      sessionCookieMaxAge = +settings.sessionCookieMaxAge;
    }
    if (settings.sessionCookieName) {
      sessionCookieName = settings.sessionCookieName;
    }
    if (settings.sessionCookieSecure) {
      sessionCookieSecure = parseBoolean(settings.sessionCookieSecure);
    }
    if (ctx.url.match('/logout')) {
      await clearCookie(ctx);
      ctx.redirect('/app');
      return;
    } else {
      debug('init');
      await init(ctx);
      debug('setCookie');
      await setCookie(ctx);
      debug('next');
      await next();
      debug('commit');
      await commit(ctx);
      debug('fini');
    }
  }

  return middleware;
}
