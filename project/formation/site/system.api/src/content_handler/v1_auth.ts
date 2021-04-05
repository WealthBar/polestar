import {resolvedVoid} from 'ts_agnostic';
import {ctxType} from 'node_core';
import {value as v1AuthSql} from './v1_auth_sql';

// subset ctx to the fields we use to make testing easier.
export async function v1AuthHandler(ctx: Pick<ctxType, 'url' | 'res' | 'req' | 'remoteAddress' | 'db'>): Promise<void> {
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    ctx.res.writeHead(403, {'Content-Type': 'text/plain'}).end();
    return resolvedVoid;
  }
  const bearerToken = authHeader.substr(7);
  const remoteAddress = ctx.remoteAddress;
  const r = await ctx.db<{ r: boolean }>(db => db.one(v1AuthSql, {bearerToken, remoteAddress}));
  if (!r?.r) {
    ctx.res.writeHead(403, {'Content-Type': 'text/plain'}).end();
    return resolvedVoid;
  }
  return resolvedVoid;
}
