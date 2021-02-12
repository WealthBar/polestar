import {resolvedVoid} from 'ts_agnostic';
import {ctxType} from 'node_core';

// subset ctx to the fields we use to make testing easier.
export function helloHandler(ctx: Pick<ctxType, 'url' | 'res'>): Promise<void> {
  if (ctx.url.path !== '/hello') {
    return resolvedVoid;
  }

  ctx.res.statusCode = 200;
  ctx.res.setHeader('Content-Type', 'text/plain');
  ctx.res.end('Hello');
  return resolvedVoid;
}
