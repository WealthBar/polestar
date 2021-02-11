import {ctxReqType, ctxType, urlType} from './server.type';
import {IncomingMessage, ServerResponse} from 'http';
import {dbProviderType} from './db';
import {dbProviderCtx, toDbProvideCtx} from './db_util';

function parseUrl(rawUrl: string): urlType {
  const m = rawUrl.match(/^\/?(?<path>([^/?]\/?)*)(\?(?<params>.*$))?/);
  if (!m || !m.groups) {
    return {path: '/', params: []};
  }

  const path = '/' + m.groups.path;
  let params: [string, string][] = [];
  if (m.groups.params) {
    params = m.groups.params.split('&').map(p => {
      const x = p.split('=');
      return [decodeURIComponent(x[0]), decodeURIComponent(x[1] || '')];
    });
  }
  return {path, params};
}

export function parseCookie(cookie: string | undefined): [string, string][] {
  if (!cookie) {
    return [];
  }
  return cookie.split('; ').map(p => {
    const x = p.split('=');
    return [decodeURIComponent(x[0]), decodeURIComponent(x[1] || '')];
  });
}


export function ctxReqCtor(req: IncomingMessage, dbProvider: dbProviderType): ctxReqType {
  const url = parseUrl(req.url?.toString() || '/');
  const cookie = parseCookie(req.headers.cookie);
  const db = toDbProvideCtx('-', '-', dbProvider);
  return {req, url, session: {}, sessionId: '', cookie, dbProvider, db};
}

export function ctxCtor(req: IncomingMessage, res: ServerResponse, dbProvider: dbProviderType): ctxType {
  const ctx = ctxReqCtor(req, dbProvider) as ctxType;
  ctx.res = res;
  return ctx;
}

export type ctxCtorType = typeof ctxCtor;

export function ctxSetDb(ctx: { user?: { login?: string }, sessionId: string, dbProvider: dbProviderType, db?: dbProviderCtx }): void {
  ctx.db = toDbProvideCtx(ctx?.user?.login || '-', ctx.sessionId, ctx.dbProvider);
}

export const _internal_ = {parseUrl, parseCookie};
