import {tuidCtor} from '../../../../agnostic/src/tuid';
import debugCtor = require('debug');

const debug = debugCtor('middleware:request_id');

export type ctxRequestIdType = { requestId: string };

export async function requestId(ctx, next) {
  ctx.requestId = tuidCtor();
  debug(`${ctx.requestId} ${ctx.url} `);
  await next();
}
