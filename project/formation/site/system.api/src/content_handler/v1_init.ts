import {resolvedVoid} from 'ts_agnostic';
import {ctxBody, ctxType} from 'node_core';

// subset ctx to the fields we use to make testing easier.
export async function v1InitHandler(ctx: Pick<ctxType, 'url' | 'res' | 'req' | 'body'>): Promise<void> {
  console.log(ctx.url.path);
  if (ctx.url.path !== '/v1/init') {
    return resolvedVoid;
  }

  if (!(await ctxBody(ctx))) {
    return resolvedVoid;
  }

  console.log('body', ctx.body);

  ctx.res.statusCode = 200;
  ctx.res.setHeader('Content-Type', 'application/json');
  ctx.res.end('{}');
  return resolvedVoid;
}
