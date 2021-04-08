import {ctxReqType, ctxType, serverSettingsType, urlType} from './server.type';
import {IncomingMessage, ServerResponse} from 'http';
import {dbProviderType} from './db';
import {dbProviderCtx, toDbProvideCtx} from './db_util';
import {resolvedFalse, resolvedTrue, resolvedVoid} from 'ts_agnostic';

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

function parseCookie(cookie: string | undefined): [string, string][] {
  if (!cookie) {
    return [];
  }
  return cookie.split('; ').map(p => {
    const x = p.split('=');
    return [decodeURIComponent(x[0]), decodeURIComponent(x[1] || '')];
  });
}

export function ctxReqCtor(
  req: IncomingMessage,
  dbProvider: dbProviderType,
  settings: serverSettingsType,
): ctxReqType {
  const url = parseUrl(req.url?.toString() || '/');
  const cookie = parseCookie(req.headers.cookie);
  const db = toDbProvideCtx('-', '-', dbProvider);
  return {
    req,
    url,
    session: {},
    sessionId: '',
    cookie,
    dbProvider,
    db,
    settings,
    remoteAddress: req.connection?.remoteAddress || '',
  };
}

export function ctxCtor(req: IncomingMessage, res: ServerResponse, dbProvider: dbProviderType, settings: serverSettingsType): ctxType {
  const ctx = ctxReqCtor(req, dbProvider, settings) as ctxType;
  ctx.res = res;
  return ctx;
}

export type ctxCtorType = typeof ctxCtor;

export function ctxSetDb(ctx: { user?: { login?: string }, sessionId: string, dbProvider: dbProviderType, db?: dbProviderCtx }): void {
  ctx.db = toDbProvideCtx(ctx?.user?.login || '-', ctx.sessionId, ctx.dbProvider);
}

export async function ctxBody(ctx: Pick<ctxType, 'req' | 'res' | 'body'>, maxBodyLength = 1e6): Promise<boolean> {
  if (ctx.body) {
    return resolvedTrue;
  }
  if (ctx.req.method !== 'POST') {
    ctx.res.writeHead(405, {'Content-Type': 'text/plain'}).end();
    return resolvedFalse;
  }
  // this assumes the LB in front of the service handles slow rollers for us.
  // otherwise this should be paired with a timeout.
  return new Promise<boolean>((r) => {
    const chunks: string[] = [];
    let totalChars = 0;
    ctx.req.on('data', (chunk: string) => {
      chunks.push(chunk);
      totalChars += chunk.length;
      if (totalChars > maxBodyLength) {
        ctx.res.writeHead(413, {'Content-Type': 'text/plain'}).end();
        r(false);
      }
    });
    ctx.req.on('end', () => {
      ctx.body = chunks.join('');
      r(true);
    });
  });
}

export const _internal_ = {parseUrl, parseCookie};
