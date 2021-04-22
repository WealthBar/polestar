import {resolvedVoid} from 'ts_agnostic';
import {ctxType} from 'node_core';
import {value as v1AuthSql} from './v1_auth_sql';
import {Object} from 'ts-toolbelt';

// subset ctx to the fields we use to make testing easier.
export async function v1AuthHandler(
ctx: Pick<ctxType, 'url' | 'remoteAddress' | 'db' | 'note'>
& Object.P.Pick<ctxType, ['res', 'statusCode' | 'setHeader' | 'end']>
& Object.P.Pick<ctxType, ['req', 'headers']>
): Promise<void> {
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    ctx.res.statusCode = 403;
    ctx.res.setHeader('Content-Type', 'text/plain');
    ctx.res.end();
    return resolvedVoid;
  }
  const bearerToken = authHeader.substr(7);
  const remoteAddress = ctx.remoteAddress;
  const r = await ctx.db<{
    system_id: string,
    system_name: string,
    domain: string,
    secret_key: string,
    error_url: string
  }|null>(db => db.oneOrNone(v1AuthSql, {bearerToken, remoteAddress}));
  if (!r?.system_name) {
    ctx.res.statusCode = 403;
    ctx.res.setHeader('Content-Type', 'text/plain');
    ctx.res.end();
    return resolvedVoid;
  }
  ctx.note ||= {};
  ctx.note['system'] = {
    bearerToken,
    systemId: r.system_id,
    systemName: r.system_name,
    domain: r.domain,
    secretKey: r.secret_key,
    errorUrl: r.error_url,
  };
  return resolvedVoid;
}
