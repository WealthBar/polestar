import {resolvedVoid} from 'ts_agnostic';
import {ctxType} from 'node_core';

// subset ctx to the fields we use to make testing easier.
export function v1ResultHandler(ctx: Pick<ctxType, 'url' | 'res'>): Promise<void> {
  if (ctx.url.path !== '/v1/result') {
    return resolvedVoid;
  }

  ctx.res.statusCode = 200;
  ctx.res.setHeader('Content-Type', 'application/json');
  ctx.res.end('{}');
  return resolvedVoid;
}
